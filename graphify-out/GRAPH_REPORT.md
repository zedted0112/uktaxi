# Graph Report - /Users/himalayancoder/Downloads/UKParivahan-sync  (2026-05-01)

## Corpus Check
- 61 files · ~86,960 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 239 nodes · 342 edges · 42 communities detected
- Extraction: 77% EXTRACTED · 23% INFERRED · 0% AMBIGUOUS · INFERRED: 79 edges (avg confidence: 0.75)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]

## God Nodes (most connected - your core abstractions)
1. `get_db()` - 27 edges
2. `Notification` - 12 edges
3. `auto_mark_departed_rides()` - 11 edges
4. `_future_date_unique()` - 11 edges
5. `send_notification()` - 10 edges
6. `User` - 9 edges
7. `TestRequestFlow` - 9 edges
8. `BookingRequest` - 8 edges
9. `_register_driver()` - 8 edges
10. `create_request()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `Persist a notification to MongoDB so the user can read it in the     in-app inbo` --uses--> `Notification`  [INFERRED]
  /Users/himalayancoder/Downloads/UKParivahan-sync/backend/app/notifications.py → /Users/himalayancoder/Downloads/UKParivahan-sync/backend/app/models/notification.py
- `quickSignIn()` --calls--> `me()`  [INFERRED]
  /Users/himalayancoder/Downloads/UKParivahan-sync/frontend/app/auth.tsx → /Users/himalayancoder/Downloads/UKParivahan-sync/backend/app/routers/auth.py
- `get_db()` --calls--> `send_notification()`  [INFERRED]
  /Users/himalayancoder/Downloads/UKParivahan-sync/backend/app/database.py → /Users/himalayancoder/Downloads/UKParivahan-sync/backend/app/notifications.py
- `get_db()` --calls--> `verify_otp()`  [INFERRED]
  /Users/himalayancoder/Downloads/UKParivahan-sync/backend/app/database.py → /Users/himalayancoder/Downloads/UKParivahan-sync/backend/app/routers/auth.py
- `get_db()` --calls--> `auto_mark_departed_rides()`  [INFERRED]
  /Users/himalayancoder/Downloads/UKParivahan-sync/backend/app/database.py → /Users/himalayancoder/Downloads/UKParivahan-sync/backend/app/routers/rides.py

## Communities

### Community 0 - "Community 0"
Cohesion: 0.09
Nodes (10): _future_date(), _future_date_series(), _future_date_unique(), Uttarkashi Taxi Union — Phase 3 API tests (vehicles / driver-first rides / reque, _register_driver(), TestMultiRequestRules, TestOfflineSeats, TestPublishRide (+2 more)

### Community 1 - "Community 1"
Cohesion: 0.11
Nodes (18): me(), register_user(), verify_otp(), close_client(), _debug_log(), ensure_indexes(), get_client(), get_db() (+10 more)

### Community 2 - "Community 2"
Cohesion: 0.12
Nodes (29): can_cancel(), generate_ref(), is_completed_after_arrival(), is_departed(), parse_depart(), Convert date + 12-hour departure text into a comparable datetime., Return True when cancellation is allowed by the 30-minute cutoff rule., Generate a short human-readable booking reference. (+21 more)

### Community 3 - "Community 3"
Cohesion: 0.22
Nodes (12): BaseModel, CreateRequestIn, GuestPassenger, OfflineSeatsIn, PublishRideIn, Ride, RidePublic, Lazily close rides whose departure time has passed.     - ride.status: published (+4 more)

### Community 4 - "Community 4"
Cohesion: 0.18
Nodes (12): Notification, list_notifications(), mark_all_read(), mark_read(), Return all notifications for the given phone, newest first., Return the number of unread notifications for the given phone., Return the number of unread notifications for the given phone., Mark a single notification as read. (+4 more)

### Community 5 - "Community 5"
Cohesion: 0.17
Nodes (5): useAuth(), BellIcon(), DriverNotifications(), PassengerNotifications(), useNotifications()

### Community 6 - "Community 6"
Cohesion: 0.33
Nodes (3): formattedPhone(), quickSignIn(), sendOtp()

### Community 7 - "Community 7"
Cohesion: 0.52
Nodes (5): applyFrom(), applyTo(), hasRoute(), reverseRoute(), syncChipIndex()

### Community 8 - "Community 8"
Cohesion: 0.38
Nodes (4): request(), statusOf(), submitRequest(), toggleSeat()

### Community 9 - "Community 9"
Cohesion: 0.33
Nodes (0): 

### Community 10 - "Community 10"
Cohesion: 0.33
Nodes (1): TestAuthRegister

### Community 11 - "Community 11"
Cohesion: 0.7
Nodes (4): buildBaseCandidates(), getHostIpBase(), normalizeBase(), req()

### Community 12 - "Community 12"
Cohesion: 0.4
Nodes (0): 

### Community 13 - "Community 13"
Cohesion: 0.5
Nodes (0): 

### Community 14 - "Community 14"
Cohesion: 0.5
Nodes (0): 

### Community 15 - "Community 15"
Cohesion: 0.67
Nodes (1): confirmLogout()

### Community 16 - "Community 16"
Cohesion: 0.67
Nodes (0): 

### Community 17 - "Community 17"
Cohesion: 0.67
Nodes (0): 

### Community 18 - "Community 18"
Cohesion: 0.67
Nodes (0): 

### Community 19 - "Community 19"
Cohesion: 0.67
Nodes (0): 

### Community 20 - "Community 20"
Cohesion: 1.0
Nodes (0): 

### Community 21 - "Community 21"
Cohesion: 1.0
Nodes (0): 

### Community 22 - "Community 22"
Cohesion: 1.0
Nodes (0): 

### Community 23 - "Community 23"
Cohesion: 1.0
Nodes (0): 

### Community 24 - "Community 24"
Cohesion: 1.0
Nodes (0): 

### Community 25 - "Community 25"
Cohesion: 1.0
Nodes (0): 

### Community 26 - "Community 26"
Cohesion: 1.0
Nodes (0): 

### Community 27 - "Community 27"
Cohesion: 1.0
Nodes (0): 

### Community 28 - "Community 28"
Cohesion: 1.0
Nodes (0): 

### Community 29 - "Community 29"
Cohesion: 1.0
Nodes (0): 

### Community 30 - "Community 30"
Cohesion: 1.0
Nodes (0): 

### Community 31 - "Community 31"
Cohesion: 1.0
Nodes (0): 

### Community 32 - "Community 32"
Cohesion: 1.0
Nodes (0): 

### Community 33 - "Community 33"
Cohesion: 1.0
Nodes (0): 

### Community 34 - "Community 34"
Cohesion: 1.0
Nodes (0): 

### Community 35 - "Community 35"
Cohesion: 1.0
Nodes (0): 

### Community 36 - "Community 36"
Cohesion: 1.0
Nodes (0): 

### Community 37 - "Community 37"
Cohesion: 1.0
Nodes (0): 

### Community 38 - "Community 38"
Cohesion: 1.0
Nodes (0): 

### Community 39 - "Community 39"
Cohesion: 1.0
Nodes (0): 

### Community 40 - "Community 40"
Cohesion: 1.0
Nodes (0): 

### Community 41 - "Community 41"
Cohesion: 1.0
Nodes (1): Returns True when departure is more than 30 minutes away (IST).

## Knowledge Gaps
- **13 isolated node(s):** `Ensure critical indexes exist for booking/ride integrity and query performance.`, `Attach seats_left and strip the MongoDB _id field.`, `Convert date + 12-hour departure text into a comparable datetime.`, `Return True when cancellation is allowed by the 30-minute cutoff rule.`, `Generate a short human-readable booking reference.` (+8 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 20`** (2 nodes): `cancel()`, `bookings.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 21`** (2 nodes): `cancel()`, `[id].tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 22`** (2 nodes): `moveDirectories()`, `reset-project.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 23`** (2 nodes): `Card()`, `Card.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 24`** (2 nodes): `timeAgo()`, `NotificationsScreen.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 25`** (2 nodes): `LoadingSpinner()`, `LoadingSpinner.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 26`** (2 nodes): `Button()`, `Button.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 27`** (2 nodes): `EmptyState()`, `EmptyState.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 28`** (2 nodes): `useVehicles.ts`, `useVehicles()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 29`** (1 nodes): `expo-env.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 30`** (1 nodes): `metro.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 31`** (1 nodes): `eslint.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 32`** (1 nodes): `_layout.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 33`** (1 nodes): `+html.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 34`** (1 nodes): `rides.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 35`** (1 nodes): `theme.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 36`** (1 nodes): `Badge.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 37`** (1 nodes): `__init__.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 38`** (1 nodes): `server.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 39`** (1 nodes): `__init__.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 40`** (1 nodes): `__init__.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 41`** (1 nodes): `Returns True when departure is more than 30 minutes away (IST).`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `get_db()` connect `Community 1` to `Community 2`, `Community 4`?**
  _High betweenness centrality (0.066) - this node is a cross-community bridge._
- **Why does `me()` connect `Community 1` to `Community 6`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Why does `quickSignIn()` connect `Community 6` to `Community 1`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Are the 23 inferred relationships involving `get_db()` (e.g. with `send_notification()` and `startup_event()`) actually correct?**
  _`get_db()` has 23 INFERRED edges - model-reasoned connections that need verification._
- **Are the 10 inferred relationships involving `Notification` (e.g. with `Persist a notification to MongoDB so the user can read it in the     in-app inbo` and `Return all notifications for the given phone, newest first.`) actually correct?**
  _`Notification` has 10 INFERRED edges - model-reasoned connections that need verification._
- **Are the 6 inferred relationships involving `auto_mark_departed_rides()` (e.g. with `get_db()` and `is_departed()`) actually correct?**
  _`auto_mark_departed_rides()` has 6 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Ensure critical indexes exist for booking/ride integrity and query performance.`, `Attach seats_left and strip the MongoDB _id field.`, `Convert date + 12-hour departure text into a comparable datetime.` to the rest of the system?**
  _13 weakly-connected nodes found - possible documentation gaps or missing edges._