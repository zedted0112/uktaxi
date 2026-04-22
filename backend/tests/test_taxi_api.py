"""Uttarkashi Taxi Union — Phase 2 API tests (auth / rides / requests)."""
import os
import uuid
from datetime import datetime, timedelta, timezone

import pytest
import requests

BASE_URL = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"

SEED_USER_PHONE = "+91 98765 00001"    # Aarav Sharma
SEED_DRIVER_PHONE = "+91 98765 43210"  # Rakesh Negi


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _future_date(days=30):
    return (datetime.now(timezone.utc) + timedelta(days=days)).strftime("%Y-%m-%d")


# ---------------- Auth (OTP mock + register + me) ----------------
class TestAuth:
    def test_request_otp_ok(self, api):
        r = api.post(f"{API}/auth/request-otp", json={"phone": SEED_USER_PHONE}, timeout=20)
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True

    def test_verify_otp_existing_user(self, api):
        r = api.post(f"{API}/auth/verify-otp",
                     json={"phone": SEED_USER_PHONE, "otp": "123456"}, timeout=20)
        assert r.status_code == 200
        data = r.json()
        assert data["ok"] is True
        assert data["user"] is not None
        assert data["user"]["phone"] == SEED_USER_PHONE
        assert data["user"]["role"] == "user"

    def test_verify_otp_new_phone_returns_null_user(self, api):
        new_phone = f"+91 70000 {uuid.uuid4().hex[:5]}"
        r = api.post(f"{API}/auth/verify-otp",
                     json={"phone": new_phone, "otp": "654321"}, timeout=20)
        assert r.status_code == 200
        assert r.json()["user"] is None

    def test_verify_otp_rejects_short_code(self, api):
        r = api.post(f"{API}/auth/verify-otp",
                     json={"phone": SEED_USER_PHONE, "otp": "1234"}, timeout=20)
        assert r.status_code == 400

    def test_verify_otp_rejects_non_digit(self, api):
        r = api.post(f"{API}/auth/verify-otp",
                     json={"phone": SEED_USER_PHONE, "otp": "abcdef"}, timeout=20)
        assert r.status_code == 400

    def test_register_new_user_and_idempotent(self, api):
        phone = f"+91 77777 {uuid.uuid4().hex[:5]}"
        payload = {"phone": phone, "name": "TEST_New User", "role": "user"}
        r = api.post(f"{API}/auth/register", json=payload, timeout=20)
        assert r.status_code == 200, r.text
        u = r.json()
        assert u["phone"] == phone
        assert u["role"] == "user"
        uid = u["id"]

        # Second call with same phone must be idempotent
        r2 = api.post(f"{API}/auth/register",
                      json={"phone": phone, "name": "ignored", "role": "driver"},
                      timeout=20)
        assert r2.status_code == 200
        assert r2.json()["id"] == uid

        # /me
        me = api.get(f"{API}/auth/me", params={"phone": phone}, timeout=20)
        assert me.status_code == 200
        assert me.json()["phone"] == phone

    def test_register_driver_with_vehicle(self, api):
        phone = f"+91 77777 {uuid.uuid4().hex[:5]}"
        payload = {
            "phone": phone, "name": "TEST_Driver", "role": "driver",
            "vehicle_type": "Toyota Innova", "vehicle_number": "UK 07 ZZ 9999",
        }
        r = api.post(f"{API}/auth/register", json=payload, timeout=20)
        assert r.status_code == 200
        u = r.json()
        assert u["role"] == "driver"
        assert u["vehicle_type"] == "Toyota Innova"

    def test_me_404(self, api):
        r = api.get(f"{API}/auth/me", params={"phone": "+91 00000 00000"}, timeout=20)
        assert r.status_code == 404


# ---------------- Rides ----------------
class TestRides:
    ride_id: str = ""
    ride_date: str = ""

    def test_publish_ride_driver_required(self, api):
        # unknown driver
        bad = {
            "driver_phone": "+91 00000 00000",
            "from_city": "Uttarkashi", "to_city": "Dehradun",
            "from_stand": "X", "to_stand": "Y",
            "date": _future_date(), "depart_time": "06:30 AM",
            "arrive_time": "11:30 AM", "duration": "5h 00m",
            "price": 500, "total_seats": 6,
        }
        r = api.post(f"{API}/rides", json=bad, timeout=20)
        assert r.status_code == 404

    def test_publish_ride_success(self, api):
        TestRides.ride_date = _future_date(30)
        payload = {
            "driver_phone": SEED_DRIVER_PHONE,
            "from_city": "Uttarkashi", "to_city": "Dehradun",
            "from_stand": "Uttarkashi Bus Stand", "to_stand": "Dehradun ISBT",
            "date": TestRides.ride_date, "depart_time": "07:00 AM",
            "arrive_time": "12:00 PM", "duration": "5h 00m",
            "price": 500, "total_seats": 6,
        }
        r = api.post(f"{API}/rides", json=payload, timeout=20)
        assert r.status_code == 200, r.text
        ride = r.json()
        assert ride["driver_phone"] == SEED_DRIVER_PHONE
        assert ride["status"] == "published"
        assert ride["price"] == 500
        TestRides.ride_id = ride["id"]

        # GET back
        g = api.get(f"{API}/rides/{ride['id']}", timeout=20)
        assert g.status_code == 200
        assert g.json()["seats_left"] == 6

    def test_list_rides_filter_route_and_date(self, api):
        r = api.get(f"{API}/rides",
                    params={"from_city": "Uttarkashi", "to_city": "Dehradun",
                            "date": TestRides.ride_date}, timeout=20)
        assert r.status_code == 200
        rides = r.json()
        assert any(x["id"] == TestRides.ride_id for x in rides)
        for x in rides:
            assert x["status"] == "published"
            assert x["from_city"] == "Uttarkashi"
            assert x["to_city"] == "Dehradun"
            assert x["date"] == TestRides.ride_date

    def test_list_rides_driver_phone_returns_all_statuses(self, api):
        r = api.get(f"{API}/rides",
                    params={"driver_phone": SEED_DRIVER_PHONE}, timeout=20)
        assert r.status_code == 200
        rides = r.json()
        assert len(rides) >= 1
        for x in rides:
            assert x["driver_phone"] == SEED_DRIVER_PHONE


# ---------------- Requests (booking) ----------------
class TestRequests:
    ride_id: str = ""
    req_id: str = ""

    def test_setup_ride(self, api):
        # fresh ride far in future with price 300 to validate seat+cancel logic
        payload = {
            "driver_phone": SEED_DRIVER_PHONE,
            "from_city": "Uttarkashi", "to_city": "Rishikesh",
            "from_stand": "UK Stand", "to_stand": "Rishikesh Tapovan",
            "date": _future_date(60), "depart_time": "09:00 AM",
            "arrive_time": "01:30 PM", "duration": "4h 30m",
            "price": 300, "total_seats": 6,
        }
        r = api.post(f"{API}/rides", json=payload, timeout=20)
        assert r.status_code == 200
        TestRequests.ride_id = r.json()["id"]

    def test_create_request_pending(self, api):
        payload = {"ride_id": TestRequests.ride_id,
                   "user_phone": SEED_USER_PHONE, "seat_numbers": [2, 3]}
        r = api.post(f"{API}/requests", json=payload, timeout=20)
        assert r.status_code == 200, r.text
        req = r.json()
        assert req["status"] == "pending"
        assert req["seat_numbers"] == [2, 3]
        assert req["total_price"] == 600
        assert req["booking_ref"].startswith("UTK-")
        assert req["driver_phone"] == SEED_DRIVER_PHONE
        TestRequests.req_id = req["id"]

    def test_create_request_rejects_pending_seat(self, api):
        payload = {"ride_id": TestRequests.ride_id,
                   "user_phone": SEED_USER_PHONE, "seat_numbers": [3]}
        r = api.post(f"{API}/requests", json=payload, timeout=20)
        assert r.status_code == 400

    def test_confirm_request_adds_booked_seats(self, api):
        r = api.post(f"{API}/requests/{TestRequests.req_id}/confirm", timeout=20)
        assert r.status_code == 200
        assert r.json()["status"] == "confirmed"

        ride = api.get(f"{API}/rides/{TestRequests.ride_id}", timeout=20).json()
        assert 2 in ride["booked_seats"] and 3 in ride["booked_seats"]
        assert ride["seats_left"] == 4

    def test_create_request_rejects_already_booked(self, api):
        payload = {"ride_id": TestRequests.ride_id,
                   "user_phone": SEED_USER_PHONE, "seat_numbers": [2]}
        r = api.post(f"{API}/requests", json=payload, timeout=20)
        assert r.status_code == 400

    def test_cancel_confirmed_request_frees_seats(self, api):
        r = api.post(f"{API}/requests/{TestRequests.req_id}/cancel", timeout=20)
        assert r.status_code == 200
        assert r.json()["status"] == "cancelled"

        ride = api.get(f"{API}/rides/{TestRequests.ride_id}", timeout=20).json()
        assert 2 not in ride["booked_seats"]
        assert 3 not in ride["booked_seats"]
        assert ride["seats_left"] == 6

    def test_reject_pending_flow(self, api):
        # create a new pending request then reject
        payload = {"ride_id": TestRequests.ride_id,
                   "user_phone": SEED_USER_PHONE, "seat_numbers": [5]}
        created = api.post(f"{API}/requests", json=payload, timeout=20).json()
        r = api.post(f"{API}/requests/{created['id']}/reject", timeout=20)
        assert r.status_code == 200
        assert r.json()["status"] == "rejected"
        # cannot confirm a rejected request
        r2 = api.post(f"{API}/requests/{created['id']}/confirm", timeout=20)
        assert r2.status_code == 400

    def test_list_requests_by_user_and_driver(self, api):
        ru = api.get(f"{API}/requests",
                     params={"user_phone": SEED_USER_PHONE}, timeout=20)
        assert ru.status_code == 200
        assert any(x["id"] == TestRequests.req_id for x in ru.json())
        rd = api.get(f"{API}/requests",
                     params={"driver_phone": SEED_DRIVER_PHONE}, timeout=20)
        assert rd.status_code == 200
        assert any(x["ride_id"] == TestRequests.ride_id for x in rd.json())


# ---------------- Ride cancel auto-cancels requests ----------------
class TestCancelRide:
    def test_cancel_ride_cancels_requests(self, api):
        # new ride + pending request
        ride_payload = {
            "driver_phone": SEED_DRIVER_PHONE,
            "from_city": "Uttarkashi", "to_city": "Dehradun",
            "from_stand": "A", "to_stand": "B",
            "date": _future_date(45), "depart_time": "10:00 AM",
            "arrive_time": "03:00 PM", "duration": "5h 00m",
            "price": 400, "total_seats": 6,
        }
        ride = api.post(f"{API}/rides", json=ride_payload, timeout=20).json()
        req = api.post(f"{API}/requests",
                       json={"ride_id": ride["id"],
                             "user_phone": SEED_USER_PHONE,
                             "seat_numbers": [1]}, timeout=20).json()
        r = api.post(f"{API}/rides/{ride['id']}/cancel", timeout=20)
        assert r.status_code == 200
        # verify ride cancelled
        got = api.get(f"{API}/rides/{ride['id']}", timeout=20).json()
        assert got["status"] == "cancelled"
        # verify request auto-cancelled
        got_req = api.get(f"{API}/requests/{req['id']}", timeout=20).json()
        assert got_req["status"] == "cancelled"
