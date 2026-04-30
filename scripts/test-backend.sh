#!/usr/bin/env bash

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PYTHON_BIN="${ROOT}/backend/.venv/bin/python3.13"
DEFAULT_TEST_FILE="backend/tests/test_taxi_api.py"

if [[ ! -x "${PYTHON_BIN}" ]]; then
  echo "Missing Python venv interpreter: ${PYTHON_BIN}" >&2
  echo "Create backend venv first, then retry." >&2
  exit 1
fi

# Integration tests in backend/tests/test_taxi_api.py expect this env var.
export EXPO_PUBLIC_BACKEND_URL="${EXPO_PUBLIC_BACKEND_URL:-http://127.0.0.1:8000}"

cd "${ROOT}"

TEST_ARGS=("$@")
if [[ $# -eq 0 ]]; then
  TEST_ARGS=("${DEFAULT_TEST_FILE}")
fi

LOG_FILE="$(mktemp -t uktaxi-pytest-XXXX.log)"
set +e
"${PYTHON_BIN}" -m pytest -v "${TEST_ARGS[@]}" | tee "${LOG_FILE}"
PYTEST_EXIT=${PIPESTATUS[0]}
set -e

SHOULD_REPORT=0
for arg in "${TEST_ARGS[@]}"; do
  if [[ "${arg}" == "${DEFAULT_TEST_FILE}" ]]; then
    SHOULD_REPORT=1
    break
  fi
done

if [[ "${SHOULD_REPORT}" -eq 1 ]]; then
  "${PYTHON_BIN}" - <<'PY' "${LOG_FILE}"
import re
import sys
from collections import defaultdict

log_path = sys.argv[1]
status_by_test = {}

pattern = re.compile(r"backend/tests/test_taxi_api\.py::([^\s]+)\s+(PASSED|FAILED)")
with open(log_path, "r", encoding="utf-8") as f:
    for line in f:
        m = pattern.search(line)
        if m:
            status_by_test[m.group(1)] = m.group(2)

expected = {
    "TestVehicles::test_list_vehicles": "Vehicle catalog returns expected presets and seat layouts.",
    "TestVehicles::test_get_vehicle_404": "Unknown vehicle ID returns 404.",
    "TestAuthRegister::test_request_and_verify_otp_existing": "OTP request/verify succeeds for existing user.",
    "TestAuthRegister::test_verify_otp_invalid": "Invalid OTP format is rejected.",
    "TestAuthRegister::test_register_driver_bolero_populates_layout": "Driver registration with bolero sets correct vehicle snapshot.",
    "TestAuthRegister::test_register_driver_invalid_preset_400": "Invalid driver vehicle preset is rejected.",
    "TestAuthRegister::test_update_driver_vehicle": "Driver vehicle update works and validates preset.",
    "TestPublishRide::test_publish_uses_driver_layout_and_offline": "Publish ride stores driver layout and offline seats.",
    "TestPublishRide::test_publish_rejects_invalid_offline_seat": "Publishing with invalid offline seat is blocked.",
    "TestPublishRide::test_publish_unknown_driver": "Publishing with unknown driver is blocked.",
    "TestPublishRide::test_publish_rejects_past_departure": "Past departure rides are rejected.",
    "TestPublishRide::test_publish_rejects_second_active_ride_same_day": "Second active same-day ride for same driver is blocked.",
    "TestPublishRide::test_list_rides_has_seat_layout": "Ride listing includes seat layout/offline seat data.",
    "TestOfflineSeats::test_update_offline_seats": "Offline update preserves confirmed online seats.",
    "TestOfflineSeats::test_update_offline_seats_rejects_non_published": "Offline updates on non-published rides are blocked.",
    "TestOfflineSeats::test_update_offline_seats_rejects_pending_online_seat": "Pending/confirmed online seats cannot be moved offline.",
    "TestRequestFlow::test_setup_ride_with_offline": "Request flow setup ride is created successfully.",
    "TestRequestFlow::test_create_request_success": "Valid request creation succeeds and computes totals.",
    "TestRequestFlow::test_reject_offline_seat": "Requesting an offline seat is rejected.",
    "TestRequestFlow::test_reject_pending_seat": "Requesting a pending seat is rejected.",
    "TestRequestFlow::test_reject_invalid_seat": "Invalid seat number is rejected.",
    "TestRequestFlow::test_confirm_adds_to_booked": "Confirm request transitions status and books seats.",
    "TestRequestFlow::test_reject_already_booked": "Already booked seat cannot be requested again.",
    "TestRequestFlow::test_same_ride_additional_seat_requires_guest_info": "Extra seat on same confirmed ride requires guest details and merges.",
    "TestMultiRequestRules::test_setup_user_and_rides": "Multi-request setup user and rides succeeds.",
    "TestMultiRequestRules::test_max_four_active_pending": "Passenger cannot exceed four pending requests.",
    "TestMultiRequestRules::test_confirm_cancels_other_pending_requests": "Confirming one request auto-cancels remaining pending requests.",
    "TestMultiRequestRules::test_confirmed_user_cannot_request_other_rides": "Confirmed user cannot book another ride simultaneously.",
}

def bar(done: int, total: int, width: int = 24) -> str:
    if total <= 0:
        return "░" * width
    filled = int(round((done / total) * width))
    return ("█" * filled) + ("░" * (width - filled))

GREEN = "\033[32m"
RED = "\033[31m"
YELLOW = "\033[33m"
CYAN = "\033[36m"
BOLD = "\033[1m"
RESET = "\033[0m"

def color_status(status: str) -> str:
    if status == "PASSED":
        return f"{GREEN}{status}{RESET}"
    if status == "FAILED":
        return f"{RED}{status}{RESET}"
    return f"{YELLOW}{status}{RESET}"

print("\n" + "=" * 78)
print(f"{BOLD}{CYAN}UKTaxi Backend Test Dashboard{RESET}")
print("=" * 78)

passed = failed = missing = 0
suite_totals = defaultdict(lambda: {"PASSED": 0, "FAILED": 0, "NOT_RUN": 0})

for test_id, exp in expected.items():
    status = status_by_test.get(test_id, "NOT_RUN")
    if status == "PASSED":
        passed += 1
    elif status == "FAILED":
        failed += 1
    else:
        missing += 1
    suite = test_id.split("::", 1)[0]
    suite_totals[suite][status] += 1

total = len(expected)
print(f"Total tests mapped: {total}")
print(
    f"Passed: {GREEN}{passed}{RESET}  "
    f"Failed: {RED}{failed}{RESET}  "
    f"Not run: {YELLOW}{missing}{RESET}"
)
print(f"Pass rate: {passed}/{total}  {GREEN}{bar(passed, total)}{RESET}")

print("\nSuite chart:")
for suite in sorted(suite_totals):
    s_pass = suite_totals[suite]["PASSED"]
    s_fail = suite_totals[suite]["FAILED"]
    s_nr = suite_totals[suite]["NOT_RUN"]
    s_total = s_pass + s_fail + s_nr
    print(
        f"- {suite:<24} {s_pass:>2}/{s_total:<2} "
        f"{GREEN}{bar(s_pass, s_total, width=18)}{RESET}  "
        f"fail={RED}{s_fail}{RESET} skip={YELLOW}{s_nr}{RESET}"
    )

print("\nExpected vs actual:")
for test_id, exp in expected.items():
    status = status_by_test.get(test_id, "NOT_RUN")
    icon = (
        f"{GREEN}✓{RESET}" if status == "PASSED"
        else (f"{RED}✗{RESET}" if status == "FAILED" else f"{YELLOW}•{RESET}")
    )
    print(f"{icon} {test_id}")
    print(f"    expected: {exp}")
    print(f"    actual:   {color_status(status)}")

print("\n" + "-" * 78)
print(
    "Report summary: "
    f"passed={GREEN}{passed}{RESET} "
    f"failed={RED}{failed}{RESET} "
    f"not_run={YELLOW}{missing}{RESET}"
)
print("-" * 78)
PY
fi

rm -f "${LOG_FILE}"
exit "${PYTEST_EXIT}"
