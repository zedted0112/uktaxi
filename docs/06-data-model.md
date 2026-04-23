# UKTaxi Data Model

## Storage Overview
Database: MongoDB (selected via `DB_NAME`).
Collections:
- `users`
- `rides`
- `requests`
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
| `vehicle_preset` | string \| null | driver | Vehicle preset ID |
| `vehicle_type` | string \| null | driver | Vehicle display name |
| `vehicle_number` | string \| null | driver | Plate number |
| `total_seats` | number \| null | driver | Derived from preset |
| `seat_layout` | number[][] \| null | driver | Seat geometry |
| `created_at` | ISO string | yes | UTC timestamp |

### Notes
- Drivers require a valid vehicle preset to publish rides.
- `phone` is effectively unique by service behavior (not enforced by index in code).

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
| `seat_layout` | number[][] | yes | Snapshot from driver |
| `from_city` | string | yes | Route origin |
| `to_city` | string | yes | Route destination |
| `from_stand` | string | yes | Pickup point |
| `to_stand` | string | yes | Drop point |
| `date` | string (`YYYY-MM-DD`) | yes | Departure date |
| `depart_time` | string | yes | Human-readable |
| `arrive_time` | string | yes | Human-readable |
| `duration` | string | yes | Human-readable |
| `price` | number | yes | Seat price |
| `total_seats` | number | yes | Vehicle capacity |
| `booked_seats` | number[] | yes | Offline + confirmed online |
| `offline_seats` | number[] | yes | Driver-blocked seats |
| `status` | `published \| cancelled \| completed` | yes | Default `published` |
| `created_at` | ISO string | yes | UTC timestamp |

### Computed API field
- `seats_left` = `total_seats - len(booked_seats)` (not stored).

## Collection: `requests`
Represents passenger seat booking requests and ticket snapshot.

### Fields
| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string (uuid) | yes | App-generated |
| `booking_ref` | string | yes | Generated `UTK-*` |
| `ride_id` | string | yes | Links to ride |
| `user_phone` | string | yes | Passenger identity |
| `user_name` | string | yes | Passenger snapshot |
| `seat_numbers` | number[] | yes | Requested seats |
| `total_price` | number | yes | `ride.price * seats` |
| `status` | `pending \| confirmed \| rejected \| cancelled` | yes | Default `pending` |
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

## Collection: `meta`
Used for schema/version control.

### Fields
| Field | Type | Notes |
|---|---|---|
| `key` | string | Uses `schema` |
| `version` | number | Mirrors `SCHEMA_VERSION` |

## State Transitions
### Ride status
```text
published -> cancelled
published -> completed (reserved for future use)
```

### Booking request status
```text
pending -> confirmed
pending -> rejected
pending -> cancelled
confirmed -> cancelled
```

## Seat Consistency Rules
1. `offline_seats` must be valid seat numbers in ride layout.
2. `booked_seats` includes:
   - all `offline_seats`
   - all seats from confirmed requests
3. Request creation rejects seats that are:
   - already in `booked_seats`
   - currently reserved by other `pending` requests
4. Confirming request appends its seats to `booked_seats`.
5. Cancelling a confirmed request removes its seats from `booked_seats`.
6. Updating offline seats preserves already confirmed online seats.

## Denormalization Strategy
- `requests` stores ride/driver snapshot fields to preserve ticket readability even if ride/driver is modified later.
- Trade-off: duplicate fields increase write complexity and potential drift if update logic changes.
