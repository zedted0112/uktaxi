"""Uttarkashi Taxi Union API tests"""
import os
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://uttarkashi-taxi.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---------------- Trips ----------------
class TestTrips:
    def test_list_all_trips_seeded(self, api):
        r = api.get(f"{API}/trips", timeout=30)
        assert r.status_code == 200
        trips = r.json()
        assert isinstance(trips, list)
        assert len(trips) >= 6, f"Expected >=6 seeded trips, got {len(trips)}"
        t = trips[0]
        for k in ["id", "from_city", "to_city", "price", "seats_left", "booked_seats", "total_seats"]:
            assert k in t
        assert t["seats_left"] == t["total_seats"] - len(t["booked_seats"])

    def test_filter_uttarkashi_dehradun(self, api):
        r = api.get(f"{API}/trips", params={"from_city": "Uttarkashi", "to_city": "Dehradun"}, timeout=30)
        assert r.status_code == 200
        trips = r.json()
        assert len(trips) >= 2
        for t in trips:
            assert t["from_city"] == "Uttarkashi"
            assert t["to_city"] == "Dehradun"

    def test_filter_uttarkashi_rishikesh(self, api):
        r = api.get(f"{API}/trips", params={"from_city": "Uttarkashi", "to_city": "Rishikesh"}, timeout=30)
        assert r.status_code == 200
        trips = r.json()
        assert len(trips) >= 2
        for t in trips:
            assert t["from_city"] == "Uttarkashi"
            assert t["to_city"] == "Rishikesh"

    def test_get_trip_by_id(self, api):
        trips = api.get(f"{API}/trips", timeout=30).json()
        tid = trips[0]["id"]
        r = api.get(f"{API}/trips/{tid}", timeout=30)
        assert r.status_code == 200
        t = r.json()
        assert t["id"] == tid
        assert t["seats_left"] == t["total_seats"] - len(t["booked_seats"])

    def test_get_trip_not_found(self, api):
        r = api.get(f"{API}/trips/nonexistent-id", timeout=30)
        assert r.status_code == 404


# ---------------- Bookings ----------------
class TestBookings:
    created_booking_id = None
    trip_id = None

    def test_create_booking_success(self, api):
        # find a trip with free seats
        trips = api.get(f"{API}/trips", params={"from_city": "Uttarkashi", "to_city": "Rishikesh"}, timeout=30).json()
        # pick the one with no booked seats
        trip = next((t for t in trips if len(t["booked_seats"]) == 0), trips[0])
        TestBookings.trip_id = trip["id"]
        # pick an unbooked seat
        seat = next(s for s in range(1, trip["total_seats"] + 1) if s not in trip["booked_seats"])
        payload = {
            "trip_id": trip["id"],
            "user_name": "TEST_Aarav Sharma",
            "user_phone": "+91 98765 00001",
            "seat_numbers": [seat],
        }
        r = api.post(f"{API}/bookings", json=payload, timeout=30)
        assert r.status_code == 200, r.text
        b = r.json()
        assert b["booking_ref"].startswith("UTK-")
        assert b["status"] == "pending"
        assert b["total_price"] == trip["price"]
        assert b["seat_numbers"] == [seat]
        TestBookings.created_booking_id = b["id"]

        # verify trip seat decrement
        t2 = api.get(f"{API}/trips/{trip['id']}", timeout=30).json()
        assert seat in t2["booked_seats"]

    def test_create_booking_rejects_taken_seat(self, api):
        trip = api.get(f"{API}/trips/{TestBookings.trip_id}", timeout=30).json()
        taken = trip["booked_seats"][0]
        payload = {
            "trip_id": trip["id"],
            "user_name": "TEST_X",
            "user_phone": "+91 98765 00001",
            "seat_numbers": [taken],
        }
        r = api.post(f"{API}/bookings", json=payload, timeout=30)
        assert r.status_code == 400

    def test_list_bookings_by_phone(self, api):
        r = api.get(f"{API}/bookings", params={"user_phone": "+91 98765 00001"}, timeout=30)
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        assert any(b["id"] == TestBookings.created_booking_id for b in items)

    def test_get_booking_by_id(self, api):
        r = api.get(f"{API}/bookings/{TestBookings.created_booking_id}", timeout=30)
        assert r.status_code == 200
        b = r.json()
        assert b["id"] == TestBookings.created_booking_id
        assert b["status"] == "pending"

    def test_confirm_booking(self, api):
        r = api.post(f"{API}/bookings/{TestBookings.created_booking_id}/confirm", timeout=30)
        assert r.status_code == 200
        assert r.json()["status"] == "confirmed"
        # verify persistence
        r2 = api.get(f"{API}/bookings/{TestBookings.created_booking_id}", timeout=30)
        assert r2.json()["status"] == "confirmed"


# ---------------- Driver ----------------
class TestDriver:
    def test_driver_all(self, api):
        r = api.get(f"{API}/driver/all", timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 6
        sample = data[0]
        assert "trip" in sample and "bookings" in sample
        assert "seats_left" in sample["trip"]
