# UKTaxi API Reference

## Base
- Base URL: `${EXPO_PUBLIC_BACKEND_URL}/api`
- Content type: `application/json`
- Auth: no token/JWT; phone identity passed in payload/query
- Error shape: FastAPI standard (`{ "detail": "..." }`)

## Health and Demo
### `GET /`
Returns API identity and schema version.

Response:
```json
{ "message": "Uttarkashi Taxi Union API", "schema": 5 }
`````

### `GET /demo/accounts`
Returns ordered demo users for one-tap login.

## Vehicles
### `GET /vehicles`
Returns full vehicle presets list.

### `GET /vehicles/{vehicle_id}`
Returns one preset by ID.

Errors:
- `404 Unknown vehicle`

## Auth and User
### `POST /auth/request-otp`
Input:
```json
{ "phone": "+91 98765 43210" }
```
Response:
```json
{ "ok": true, "message": "Use OTP 123456 (any 6-digit also accepted in demo)" }
```

### `POST /auth/verify-otp`
Input:
```json
{ "phone": "+91 98765 43210", "otp": "123456" }
```
Response:
```json
{ "ok": true, "user": { "...": "existing user or null" } }
```

Errors:
- `400 Invalid OTP` (must be 6 digits)

### `POST /auth/register`
Registers user/driver if phone is new. Returns existing user if phone already exists.

Input (`user`):
```json
{ "phone": "+91 98765 00001", "name": "Aarav Sharma", "role": "user" }
```

Input (`driver`):
```json
{
  "phone": "+91 98765 43210",
  "name": "Rakesh Negi",
  "role": "driver",
  "vehicle_preset": "bolero",
  "vehicle_number": "UK 07 TA 1234"
}
```

Errors:
- `400 Invalid vehicle preset` (driver path)

### `GET /auth/me?phone={phone}`
Returns user by phone.

Errors:
- `404 User not found`

### `POST /drivers/{phone}/vehicle`
Updates a driver's vehicle preset and number.

Input:
```json
{ "vehicle_preset": "innova", "vehicle_number": "UK 07 TA 5678" }
```

Errors:
- `404 Driver not found`
- `400 Invalid vehicle preset`

## Rides
### `POST /rides`
Publishes a ride for an existing driver.

Input:
```json
{
  "driver_phone": "+91 98765 43210",
  "from_city": "Uttarkashi",
  "to_city": "Dehradun",
  "from_stand": "Uttarkashi Bus Stand",
  "to_stand": "Dehradun ISBT",
  "date": "2026-04-24",
  "depart_time": "06:30 AM",
  "arrive_time": "11:30 AM",
  "duration": "5h 00m",
  "price": 450,
  "offline_seats": [2, 5]
}
```

Errors:
- `404 Driver not found`
- `400 Driver has no vehicle set up`
- `400 Invalid offline seat <n>`

### `GET /rides`
List rides with optional filters:
- `from_city`
- `to_city`
- `date`
- `driver_phone`

Notes:
- Without `driver_phone`, only `published` rides are returned.
- Returns computed `seats_left`.

### `GET /rides/{ride_id}`
Returns single ride with computed `seats_left`.

Errors:
- `404 Ride not found`

### `POST /rides/{ride_id}/offline-seats`
Replaces ride `offline_seats` while preserving confirmed online seats.

Input:
```json
{ "offline_seats": [2, 7] }
```

Errors:
- `404 Ride not found`
- `400 Seats already booked online: [...]`
- `400 Invalid seat <n>`

### `POST /rides/{ride_id}/cancel`
Cancels ride if current time is at least 30 minutes before departure.
Also cancels related pending/confirmed requests.

Response:
```json
{ "ok": true }
```

Errors:
- `404 Ride not found`
- `400 Cannot cancel within 30 minutes of departure`

## Booking Requests
### `POST /requests`
Creates booking request with `pending` status.

Input:
```json
{
  "ride_id": "ride-uuid",
  "user_phone": "+91 98765 00001",
  "seat_numbers": [4, 7]
}
```

Server computes:
- `booking_ref`
- `total_price`
- denormalized ticket fields (route, times, driver info, vehicle info)

Errors:
- `404 Ride not available`
- `404 User not found`
- `400 Seat <n> already booked`
- `400 Seat <n> pending another request`
- `400 Invalid seat <n>`

### `GET /requests`
Query params:
- `user_phone` (optional)
- `driver_phone` (optional)

Returns sorted list (newest first).

### `GET /requests/{req_id}`
Returns one booking request.

Errors:
- `404 Request not found`

### `POST /requests/{req_id}/confirm`
Confirms a pending request and books seats on ride.

Errors:
- `404 Request not found`
- `404 Ride not found`
- `400 Cannot confirm a <status> request`
- `400 Seat <n> already booked`

### `POST /requests/{req_id}/reject`
Rejects a pending request.

Errors:
- `404 Request not found`
- `400 Cannot reject a <status> request`

### `POST /requests/{req_id}/cancel`
Cancels a request. If request was confirmed, seats are freed from ride.

Errors:
- `404 Request not found`
- `400 Already cancelled`
- `400 Cannot cancel within 30 minutes of departure`

## Status Enums
- User role: `user | driver`
- Ride status: `published | cancelled | completed`
- Request status: `pending | confirmed | rejected | cancelled`
