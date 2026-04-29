# UKTaxi Data Model

## Storage Overview
Database: MongoDB (selected via `DB_NAME`).
Collections:
- `users`
- `rides`
- `requests`
- `notifications`
- `meta`

Application uses UUID string IDs and excludes Mongo `_id` from API payloads.

## Collection: `users`
Represents both passengers and drivers.

### Fields
| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string (uuid) | yes | App-generated |
| `phone` | string | yes | Principal identifier in API |
| `name` | string | yes | Display name |
| `role` | `user \| driver` | yes | Controls app features |
| `vehicle_preset` | string \| null | driver only | Vehicle preset ID (e.g. `bolero`) |
| `vehicle_type` | string \| null | driver only | Vehicle display name |
| `vehicle_number` | string \| null | driver only | Plate number |
| `total_seats` | number \| null | driver only | Derived from preset |
| `seat_layout` | number[][] \| null | driver only | Seat geometry grid |
| `created_at` | ISO string | yes | UTC timestamp |

### Notes
- Drivers require a valid vehicle preset to publish rides.
- `phone` is effectively unique by service behavior (no unique index enforced in code).

## Collection: `rides`
Represents published trips by drivers.

### Fields
| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string (uuid) | yes | App-generated |
| `driver_id` | string | yes | Links to user |
| `driver_phone` | string | yes | Query convenience |
| `driver_name` | string | yes | Snapshot |
| `vehicle_type` | string | yes | Snapshot |
| `vehicle_number` | string | yes | Snapshot |
| `seat_layout` | number[][] | yes | Snapshot from driver at publish time |
| `from_city` | string | yes | Route origin |
| `to_city` | string | yes | Route destination |
| `from_stand` | string | yes | Pickup point |
| `to_stand` | string | yes | Drop point |
| `date` | string (`YYYY-MM-DD`) | yes | Departure date |
| `depart_time` | string | yes | Human-readable (e.g. `06:30 AM`) |
| `arrive_time` | string | yes | Human-readable |
| `duration` | string | yes | Human-readable (e.g. `5h 00m`) |
| `price` | number | yes | Seat price in INR |
| `total_seats` | number | yes | Vehicle capacity |
| `booked_seats` | number[] | yes | Offline + confirmed online seats combined |
| `offline_seats` | number[] | yes | Driver-blocked seats |
| `status` | `published \| departed \| cancelled \| completed` | yes | Default `published` |
| `created_at` | ISO string | yes | UTC timestamp |

### Computed API field
- `seats_left` = `total_seats - len(booked_seats)` (not stored in DB, added by `ride_public()`).

## Collection: `requests`
Represents passenger seat booking requests and ticket snapshot.

### Fields
| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string (uuid) | yes | App-generated |
| `booking_ref` | string | yes | Generated `UTK-XXXXXXXX` |
| `ride_id` | string | yes | Links to ride |
| `user_phone` | string | yes | Passenger identity |
| `user_name` | string | yes | Passenger snapshot |
| `seat_numbers` | number[] | yes | Requested seats |
| `total_price` | number | yes | `ride.price * seats count` |
| `status` | `pending \| confirmed \| rejected \| cancelled \| completed` | yes | Default `pending` |
| `created_at` | ISO string | yes | UTC timestamp |
| `from_city` | string | yes | Route snapshot |
| `to_city` | string | yes | Route snapshot |
| `from_stand` | string | yes | Route snapshot |
| `to_stand` | string | yes | Route snapshot |
| `date` | string | yes | Ride snapshot |
| `depart_time` | string | yes | Ride snapshot |
| `arrive_time` | string | yes | Ride snapshot |
| `duration` | string | yes | Ride snapshot |
| `vehicle_type` | string | yes | Vehicle snapshot |
| `vehicle_number` | string | yes | Vehicle snapshot |
| `driver_name` | string | yes | Driver snapshot |
| `driver_phone` | string | yes | Driver snapshot |

## Collection: `notifications`
Stores in-app notifications for both passengers and drivers.
Frontend polls this collection every 30 seconds via `GET /api/notifications`.

### Fields
| Field | Type | Notes |
|---|---|---|
| `id` | string (uuid) | App-generated |
| `recipient_phone` | string | Notification owner |
| `title` | string | Short heading (e.g. `New Seat Request`) |
| `body` | string | Detail text |
| `type` | string | `new_request`, `booking_confirmed`, `booking_rejected`, `booking_cancelled`, `ride_cancelled` |
| `data` | object | Extra payload (e.g. `request_id`, `ride_id`) |
| `read` | boolean | Defaults to `false` |
| `created_at` | ISO string | UTC timestamp |

### Notification types
| Type | Trigger | Recipient |
|---|---|---|
| `new_request` | Passenger creates booking request | Driver |
| `booking_confirmed` | Driver confirms request | Passenger |
| `booking_rejected` | Driver rejects request | Passenger |
| `booking_cancelled` | Passenger cancels confirmed booking | Driver |
| `ride_cancelled` | Driver cancels ride | Each affected passenger |
| `ride_departed` | Ride auto-marked departed; pending request auto-cancelled | Each affected passenger |

## Collection: `meta`
Used for schema/version control.

### Fields
| Field | Type | Notes |
|---|---|---|
| `key` | string | Value: `schema` |
| `version` | number | Mirrors `SCHEMA_VERSION` in `config.py` |

## State Transitions
### Ride status
```
published → departed
published → cancelled
published → completed  (reserved for future use)
departed → completed    (after arrive_time + 10 minutes)
```

`published → departed` is applied lazily during ride/request read endpoints once departure time has passed.
When this transition happens, pending requests on that ride are auto-cancelled.
`departed → completed` is also applied lazily once `arrive_time + 10 minutes` has passed.
When this transition happens, confirmed requests on that ride are auto-updated to `completed`.

### Booking request status
```
pending → confirmed
pending → rejected
pending → cancelled
confirmed → cancelled
confirmed → completed
```

## Seat Consistency Rules
1. `offline_seats` must be valid seat numbers in ride layout.
2. `booked_seats` includes all `offline_seats` plus all seats from confirmed requests.
3. Request creation rejects seats that are:
   - already in `booked_seats`
   - currently reserved by other `pending` requests
4. Confirming a request appends its seats to `booked_seats`.
5. Cancelling a confirmed request removes its seats from `booked_seats`.
6. Updating offline seats preserves already confirmed online seats.

## Denormalization Strategy
- `requests` stores ride/driver snapshot fields to preserve ticket readability even if ride or driver is modified later.
- Trade-off: duplicate fields increase write complexity and potential drift.
