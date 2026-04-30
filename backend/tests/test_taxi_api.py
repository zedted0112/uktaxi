"""Uttarkashi Taxi Union — Phase 3 API tests (vehicles / driver-first rides / requests)."""
import os
import uuid
from datetime import datetime, timedelta, timezone

import pytest
import requests

BASE_URL = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"

SEED_USER_PHONE = "+91 98765 00001"       # Aarav Sharma
SEED_BOLERO_DRIVER = "+91 98765 43210"    # Rakesh Negi (Bolero, 9 seats)
SEED_EECO_DRIVER = "+91 99887 76655"      # Mohan Rawat (Eeco, 4 seats)


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _future_date(days=30):
    return (datetime.now(timezone.utc) + timedelta(days=days)).strftime("%Y-%m-%d")


# ---------------- Vehicles catalog ----------------
class TestVehicles:
    def test_list_vehicles(self, api):
        r = api.get(f"{API}/vehicles", timeout=20)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list) and len(data) == 5
        by_id = {v["id"]: v for v in data}
        for vid in ("bolero", "innova", "swift", "scorpio", "eeco"):
            assert vid in by_id, f"missing vehicle {vid}"
            assert "seat_layout" in by_id[vid]
            assert "total_seats" in by_id[vid]

        # Bolero layout assertion per PRD
        assert by_id["bolero"]["total_seats"] == 9
        assert by_id["bolero"]["seat_layout"] == [[1], [2, 3, 4, 5], [6, 7, 8, 9]]
        # others
        assert by_id["innova"]["total_seats"] == 7
        assert by_id["scorpio"]["total_seats"] == 7
        assert by_id["eeco"]["total_seats"] == 4
        assert by_id["eeco"]["seat_layout"] == [[1], [2, 3, 4]]

    def test_get_vehicle_404(self, api):
        r = api.get(f"{API}/vehicles/unknown", timeout=20)
        assert r.status_code == 404


# ---------------- Auth / Register with preset ----------------
class TestAuthRegister:
    def test_request_and_verify_otp_existing(self, api):
        r = api.post(f"{API}/auth/request-otp", json={"phone": SEED_USER_PHONE}, timeout=20)
        assert r.status_code == 200 and r.json()["ok"] is True
        r = api.post(f"{API}/auth/verify-otp",
                     json={"phone": SEED_USER_PHONE, "otp": "123456"}, timeout=20)
        assert r.status_code == 200
        body = r.json()
        assert body["ok"] is True
        assert body["user"]["phone"] == SEED_USER_PHONE
        assert body["user"]["role"] == "user"

    def test_verify_otp_invalid(self, api):
        assert api.post(f"{API}/auth/verify-otp",
                        json={"phone": SEED_USER_PHONE, "otp": "abc"}, timeout=20
                        ).status_code == 400

    def test_register_driver_bolero_populates_layout(self, api):
        phone = f"+91 77001 {uuid.uuid4().hex[:5]}"
        payload = {"phone": phone, "name": "TEST_Bolero Driver", "role": "driver",
                   "vehicle_preset": "bolero", "vehicle_number": "UK 07 TA 0001"}
        r = api.post(f"{API}/auth/register", json=payload, timeout=20)
        assert r.status_code == 200, r.text
        u = r.json()
        assert u["role"] == "driver"
        assert u["vehicle_preset"] == "bolero"
        assert u["total_seats"] == 9
        assert u["seat_layout"] == [[1], [2, 3, 4, 5], [6, 7, 8, 9]]
        assert u["vehicle_type"] == "Mahindra Bolero"

        # idempotent
        r2 = api.post(f"{API}/auth/register",
                      json={"phone": phone, "name": "ignored", "role": "user"}, timeout=20)
        assert r2.status_code == 200
        assert r2.json()["id"] == u["id"]

    def test_register_driver_invalid_preset_400(self, api):
        phone = f"+91 77002 {uuid.uuid4().hex[:5]}"
        r = api.post(f"{API}/auth/register", json={
            "phone": phone, "name": "TEST_bad", "role": "driver",
            "vehicle_preset": "spacecraft", "vehicle_number": "XX 00 ZZ 0000"
        }, timeout=20)
        assert r.status_code == 400

    def test_update_driver_vehicle(self, api):
        phone = f"+91 77003 {uuid.uuid4().hex[:5]}"
        api.post(f"{API}/auth/register", json={
            "phone": phone, "name": "TEST_upd", "role": "driver",
            "vehicle_preset": "eeco", "vehicle_number": "UK 07 TA 0002",
        }, timeout=20).raise_for_status()

        r = api.post(f"{API}/drivers/{phone}/vehicle",
                     json={"vehicle_preset": "scorpio", "vehicle_number": "UK 08 XY 1111"},
                     timeout=20)
        assert r.status_code == 200
        u = r.json()
        assert u["vehicle_preset"] == "scorpio"
        assert u["total_seats"] == 7
        assert u["seat_layout"] == [[1], [2, 3, 4], [5, 6, 7]]
        assert u["vehicle_number"] == "UK 08 XY 1111"

        # bad preset
        rb = api.post(f"{API}/drivers/{phone}/vehicle",
                      json={"vehicle_preset": "foo", "vehicle_number": "X"}, timeout=20)
        assert rb.status_code == 400

        # unknown driver
        rn = api.post(f"{API}/drivers/+91 00000 00000/vehicle",
                      json={"vehicle_preset": "bolero", "vehicle_number": "X"}, timeout=20)
        assert rn.status_code == 404


# ---------------- Publish ride uses driver seat layout ----------------
class TestPublishRide:
    ride_id: str = ""
    date: str = ""

    def test_publish_uses_driver_layout_and_offline(self, api):
        TestPublishRide.date = _future_date(10)
        payload = {
            "driver_phone": SEED_BOLERO_DRIVER,
            "from_city": "Uttarkashi", "to_city": "Dehradun",
            "from_stand": "UK Stand", "to_stand": "Dehradun ISBT",
            "date": TestPublishRide.date, "depart_time": "06:30 AM",
            "arrive_time": "11:30 AM", "duration": "5h 00m",
            "price": 480, "offline_seats": [3, 8],
        }
        r = api.post(f"{API}/rides", json=payload, timeout=20)
        assert r.status_code == 200, r.text
        ride = r.json()
        assert ride["total_seats"] == 9
        assert ride["seat_layout"] == [[1], [2, 3, 4, 5], [6, 7, 8, 9]]
        assert sorted(ride["offline_seats"]) == [3, 8]
        assert sorted(ride["booked_seats"]) == [3, 8]
        TestPublishRide.ride_id = ride["id"]

        g = api.get(f"{API}/rides/{ride['id']}", timeout=20).json()
        assert g["seats_left"] == 9 - 2
        assert g["seat_layout"] == [[1], [2, 3, 4, 5], [6, 7, 8, 9]]
        assert sorted(g["offline_seats"]) == [3, 8]

    def test_publish_rejects_invalid_offline_seat(self, api):
        payload = {
            "driver_phone": SEED_BOLERO_DRIVER,
            "from_city": "A", "to_city": "B", "from_stand": "x", "to_stand": "y",
            "date": _future_date(11), "depart_time": "07:00 AM",
            "arrive_time": "11:00 AM", "duration": "4h", "price": 300,
            "offline_seats": [99],
        }
        r = api.post(f"{API}/rides", json=payload, timeout=20)
        assert r.status_code == 400

    def test_publish_unknown_driver(self, api):
        payload = {
            "driver_phone": "+91 00000 00000",
            "from_city": "A", "to_city": "B", "from_stand": "x", "to_stand": "y",
            "date": _future_date(11), "depart_time": "07:00 AM",
            "arrive_time": "11:00 AM", "duration": "4h", "price": 300,
        }
        assert api.post(f"{API}/rides", json=payload, timeout=20).status_code == 404

    def test_publish_rejects_past_departure(self, api):
        past_date = (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%d")
        payload = {
            "driver_phone": SEED_BOLERO_DRIVER,
            "from_city": "Uttarkashi", "to_city": "Dehradun",
            "from_stand": "UK Stand", "to_stand": "Dehradun ISBT",
            "date": past_date, "depart_time": "06:30 AM",
            "arrive_time": "11:30 AM", "duration": "5h 00m",
            "price": 480, "offline_seats": [],
        }
        r = api.post(f"{API}/rides", json=payload, timeout=20)
        assert r.status_code == 400
        assert "Departure time already passed" in r.text

    def test_list_rides_has_seat_layout(self, api):
        r = api.get(f"{API}/rides",
                    params={"from_city": "Uttarkashi", "to_city": "Dehradun",
                            "date": TestPublishRide.date}, timeout=20)
        assert r.status_code == 200
        rides = r.json()
        found = [x for x in rides if x["id"] == TestPublishRide.ride_id]
        assert found, "published ride not in list"
        assert found[0]["seat_layout"] == [[1], [2, 3, 4, 5], [6, 7, 8, 9]]
        assert sorted(found[0]["offline_seats"]) == [3, 8]


# ---------------- Offline seats endpoint ----------------
class TestOfflineSeats:
    def test_update_offline_seats(self, api):
        # create fresh ride
        payload = {
            "driver_phone": SEED_BOLERO_DRIVER,
            "from_city": "UK", "to_city": "DDN", "from_stand": "x", "to_stand": "y",
            "date": _future_date(15), "depart_time": "08:00 AM",
            "arrive_time": "12:00 PM", "duration": "4h", "price": 400,
            "offline_seats": [2],
        }
        ride = api.post(f"{API}/rides", json=payload, timeout=20).json()
        rid = ride["id"]

        # user books seat 5 online -> confirm -> booked
        req = api.post(f"{API}/requests", json={
            "ride_id": rid, "user_phone": SEED_USER_PHONE, "seat_numbers": [5]
        }, timeout=20).json()
        api.post(
            f"{API}/requests/{req['id']}/confirm",
            params={"driver_phone": SEED_BOLERO_DRIVER},
            timeout=20,
        ).raise_for_status()

        # Now try to mark seat 5 offline -> should 400
        bad = api.post(f"{API}/rides/{rid}/offline-seats",
                       json={"offline_seats": [5]}, timeout=20)
        assert bad.status_code == 400

        # Valid update: offline=[2,7]; keeps confirmed-online [5] in booked
        ok = api.post(f"{API}/rides/{rid}/offline-seats",
                      json={"offline_seats": [2, 7]}, timeout=20)
        assert ok.status_code == 200
        got = api.get(f"{API}/rides/{rid}", timeout=20).json()
        assert sorted(got["offline_seats"]) == [2, 7]
        assert sorted(got["booked_seats"]) == [2, 5, 7]

        # invalid seat number
        r = api.post(f"{API}/rides/{rid}/offline-seats",
                     json={"offline_seats": [42]}, timeout=20)
        assert r.status_code == 400


# ---------------- Requests: booked/offline/pending enforcement ----------------
class TestRequestFlow:
    ride_id: str = ""
    req_id: str = ""
    user_phone: str = ""

    def test_setup_ride_with_offline(self, api):
        phone = f"+91 77444 {uuid.uuid4().hex[:5]}"
        reg = api.post(
            f"{API}/auth/register",
            json={"phone": phone, "name": "TEST_req_flow", "role": "user"},
            timeout=20,
        )
        assert reg.status_code == 200
        TestRequestFlow.user_phone = phone
        payload = {
            "driver_phone": SEED_BOLERO_DRIVER,
            "from_city": "UK", "to_city": "Rishikesh", "from_stand": "x", "to_stand": "y",
            "date": _future_date(40), "depart_time": "09:00 AM",
            "arrive_time": "01:30 PM", "duration": "4h 30m", "price": 350,
            "offline_seats": [9],
        }
        ride = api.post(f"{API}/rides", json=payload, timeout=20).json()
        TestRequestFlow.ride_id = ride["id"]

    def test_create_request_success(self, api):
        r = api.post(f"{API}/requests", json={
            "ride_id": TestRequestFlow.ride_id,
            "user_phone": TestRequestFlow.user_phone, "seat_numbers": [4, 7],
        }, timeout=20)
        assert r.status_code == 200, r.text
        req = r.json()
        assert req["status"] == "pending"
        assert req["seat_numbers"] == [4, 7]
        assert req["total_price"] == 350 * 2
        assert req["booking_ref"].startswith("UTK-")
        TestRequestFlow.req_id = req["id"]

    def test_reject_offline_seat(self, api):
        r = api.post(f"{API}/requests", json={
            "ride_id": TestRequestFlow.ride_id,
            "user_phone": TestRequestFlow.user_phone, "seat_numbers": [9],  # offline
        }, timeout=20)
        assert r.status_code == 400

    def test_reject_pending_seat(self, api):
        r = api.post(f"{API}/requests", json={
            "ride_id": TestRequestFlow.ride_id,
            "user_phone": TestRequestFlow.user_phone, "seat_numbers": [4],  # pending
        }, timeout=20)
        assert r.status_code == 400

    def test_reject_invalid_seat(self, api):
        r = api.post(f"{API}/requests", json={
            "ride_id": TestRequestFlow.ride_id,
            "user_phone": TestRequestFlow.user_phone, "seat_numbers": [99],
        }, timeout=20)
        assert r.status_code == 400

    def test_confirm_adds_to_booked(self, api):
        r = api.post(
            f"{API}/requests/{TestRequestFlow.req_id}/confirm",
            params={"driver_phone": SEED_BOLERO_DRIVER},
            timeout=20,
        )
        assert r.status_code == 200
        assert r.json()["status"] == "confirmed"
        ride = api.get(f"{API}/rides/{TestRequestFlow.ride_id}", timeout=20).json()
        for s in (4, 7, 9):
            assert s in ride["booked_seats"]

    def test_reject_already_booked(self, api):
        r = api.post(f"{API}/requests", json={
            "ride_id": TestRequestFlow.ride_id,
            "user_phone": TestRequestFlow.user_phone, "seat_numbers": [7],
        }, timeout=20)
        assert r.status_code == 400

    def test_same_ride_additional_seat_requires_guest_info(self, api):
        # user already has a confirmed request on this ride from previous tests
        no_guest = api.post(
            f"{API}/requests",
            json={
                "ride_id": TestRequestFlow.ride_id,
                "user_phone": TestRequestFlow.user_phone,
                "seat_numbers": [6],
            },
            timeout=20,
        )
        assert no_guest.status_code == 400
        assert "Guest name and phone are required" in no_guest.text

        with_guest = api.post(
            f"{API}/requests",
            json={
                "ride_id": TestRequestFlow.ride_id,
                "user_phone": TestRequestFlow.user_phone,
                "seat_numbers": [6],
                "guest_name": "Guest One",
                "guest_phone": "+91 90000 11111",
            },
            timeout=20,
        )
        assert with_guest.status_code == 200, with_guest.text
        body = with_guest.json()
        assert body["status"] == "confirmed"
        assert body["id"] == TestRequestFlow.req_id
        assert 6 in body["seat_numbers"]
        guests = body.get("guest_passengers") or []
        assert any(
            g["seat_number"] == 6 and g["name"] == "Guest One" and g["phone"] == "+91 90000 11111"
            for g in guests
        )


class TestMultiRequestRules:
    ride_ids: list[str] = []
    user_phone: str = ""

    def test_setup_user_and_rides(self, api):
        phone = f"+91 77111 {uuid.uuid4().hex[:5]}"
        TestMultiRequestRules.user_phone = phone
        reg = api.post(
            f"{API}/auth/register",
            json={"phone": phone, "name": "TEST_multi", "role": "user"},
            timeout=20,
        )
        assert reg.status_code == 200

        dates = [_future_date(50), _future_date(51), _future_date(52), _future_date(53), _future_date(54)]
        ride_ids: list[str] = []
        for idx, date in enumerate(dates):
            ride = api.post(
                f"{API}/rides",
                json={
                    "driver_phone": SEED_BOLERO_DRIVER,
                    "from_city": "UK",
                    "to_city": f"DDN-{idx}",
                    "from_stand": "x",
                    "to_stand": "y",
                    "date": date,
                    "depart_time": "10:00 AM",
                    "arrive_time": "02:00 PM",
                    "duration": "4h",
                    "price": 400,
                    "offline_seats": [],
                },
                timeout=20,
            )
            assert ride.status_code == 200, ride.text
            ride_ids.append(ride.json()["id"])
        TestMultiRequestRules.ride_ids = ride_ids

    def test_max_four_active_pending(self, api):
        for idx, ride_id in enumerate(TestMultiRequestRules.ride_ids[:4]):
            r = api.post(
                f"{API}/requests",
                json={
                    "ride_id": ride_id,
                    "user_phone": TestMultiRequestRules.user_phone,
                    "seat_numbers": [idx + 1],
                },
                timeout=20,
            )
            assert r.status_code == 200, r.text
            assert r.json()["status"] == "pending"

        fifth = api.post(
            f"{API}/requests",
            json={
                "ride_id": TestMultiRequestRules.ride_ids[4],
                "user_phone": TestMultiRequestRules.user_phone,
                "seat_numbers": [1],
            },
            timeout=20,
        )
        assert fifth.status_code == 400
        assert "Maximum 4 active pending requests allowed" in fifth.text

    def test_confirm_cancels_other_pending_requests(self, api):
        pending = api.get(
            f"{API}/requests", params={"user_phone": TestMultiRequestRules.user_phone}, timeout=20
        )
        assert pending.status_code == 200
        items = pending.json()
        target = items[0]
        confirm = api.post(
            f"{API}/requests/{target['id']}/confirm",
            params={"driver_phone": SEED_BOLERO_DRIVER},
            timeout=20,
        )
        assert confirm.status_code == 200, confirm.text
        assert confirm.json()["status"] == "confirmed"

        after = api.get(
            f"{API}/requests", params={"user_phone": TestMultiRequestRules.user_phone}, timeout=20
        ).json()
        confirmed = [x for x in after if x["status"] == "confirmed"]
        cancelled = [x for x in after if x["status"] == "cancelled"]
        assert len(confirmed) == 1
        assert len(cancelled) >= 3
        for req in cancelled:
            assert req.get("cancel_reason") == "Ride is booked by other Driver"

    def test_confirmed_user_cannot_request_other_rides(self, api):
        phone = f"+91 77333 {uuid.uuid4().hex[:5]}"
        reg = api.post(
            f"{API}/auth/register",
            json={"phone": phone, "name": "TEST_lock", "role": "user"},
            timeout=20,
        )
        assert reg.status_code == 200

        ride_a = api.post(
            f"{API}/rides",
            json={
                "driver_phone": SEED_BOLERO_DRIVER,
                "from_city": "Uttarkashi", "to_city": "Dehradun",
                "from_stand": "UK Stand", "to_stand": "Dehradun ISBT",
                "date": _future_date(65), "depart_time": "08:00 AM",
                "arrive_time": "12:30 PM", "duration": "4h 30m",
                "price": 450, "offline_seats": [],
            },
            timeout=20,
        )
        ride_b = api.post(
            f"{API}/rides",
            json={
                "driver_phone": SEED_EECO_DRIVER,
                "from_city": "Uttarkashi", "to_city": "Rishikesh",
                "from_stand": "UK Stand", "to_stand": "Rishikesh Tapovan",
                "date": _future_date(66), "depart_time": "10:00 AM",
                "arrive_time": "02:00 PM", "duration": "4h",
                "price": 350, "offline_seats": [],
            },
            timeout=20,
        )
        assert ride_a.status_code == 200 and ride_b.status_code == 200
        ride_a_id = ride_a.json()["id"]
        ride_b_id = ride_b.json()["id"]

        req_a = api.post(
            f"{API}/requests",
            json={"ride_id": ride_a_id, "user_phone": phone, "seat_numbers": [1]},
            timeout=20,
        )
        assert req_a.status_code == 200
        conf = api.post(
            f"{API}/requests/{req_a.json()['id']}/confirm",
            params={"driver_phone": SEED_BOLERO_DRIVER},
            timeout=20,
        )
        assert conf.status_code == 200

        blocked = api.post(
            f"{API}/requests",
            json={"ride_id": ride_b_id, "user_phone": phone, "seat_numbers": [1]},
            timeout=20,
        )
        assert blocked.status_code == 400
        assert "confirmed booking on another ride" in blocked.text
