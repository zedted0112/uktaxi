# Graph Report - /Users/himalayancoder/Downloads/UKParivahan-sync  (2026-05-04)

## Corpus Check
- 68 files · ~316,880 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 284 nodes · 411 edges · 45 communities detected
- Extraction: 75% EXTRACTED · 25% INFERRED · 0% AMBIGUOUS · INFERRED: 102 edges (avg confidence: 0.74)
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
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]

## God Nodes (most connected - your core abstractions)
1. `get_db()` - 30 edges
2. `Notification` - 16 edges
3. `auto_mark_departed_rides()` - 11 edges
4. `User` - 11 edges
5. `_future_date_unique()` - 11 edges
6. `send_notification()` - 10 edges
7. `TestRequestFlow` - 9 edges
8. `BookingRequest` - 8 edges
9. `Ride` - 8 edges
10. `_register_driver()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `get_db()` --calls--> `get_current_user()`  [INFERRED]
  /Users/himalayancoder/Downloads/UKParivahan-sync/backend/app/database.py → /Users/himalayancoder/Downloads/UKParivahan-sync/backend/app/security.py
- `quickSignIn()` --calls--> `me()`  [INFERRED]
  /Users/himalayancoder/Downloads/UKParivahan-sync/frontend/app/auth.tsx → /Users/himalayancoder/Downloads/UKParivahan-sync/backend/app/routers/auth.py
- `verifyOtp()` --calls--> `me()`  [INFERRED]
  /Users/himalayancoder/Downloads/UKParivahan-sync/frontend/app/auth.tsx → /Users/himalayancoder/Downloads/UKParivahan-sync/backend/app/routers/auth.py
- `get_db()` --calls--> `startup_event()`  [INFERRED]
  /Users/himalayancoder/Downloads/UKParivahan-sync/backend/app/database.py → /Users/himalayancoder/Downloads/UKParivahan-sync/backend/app/main.py
- `get_db()` --calls--> `verify_otp()`  [INFERRED]
  /Users/himalayancoder/Downloads/UKParivahan-sync/backend/app/database.py → /Users/himalayancoder/Downloads/UKParivahan-sync/backend/app/routers/auth.py

## Communities

### Community 0 - "Community 0"
Cohesion: 0.07
Nodes (11): _future_date(), _future_date_series(), _future_date_unique(), Uttarkashi Taxi Union — Phase 3 API tests (vehicles / driver-first rides / reque, _register_driver(), TestAuthRegister, TestMultiRequestRules, TestOfflineSeats (+3 more)

### Community 1 - "Community 1"
Cohesion: 0.09
Nodes (20): google_verify(), register_user(), update_me(), verify_otp(), close_client(), _debug_log(), ensure_indexes(), get_client() (+12 more)

### Community 2 - "Community 2"
Cohesion: 0.14
Nodes (29): get_db(), can_cancel(), generate_ref(), is_completed_after_arrival(), is_departed(), parse_depart(), Convert date + 12-hour departure text into a comparable datetime., Return True when cancellation is allowed by the 30-minute cutoff rule. (+21 more)

### Community 3 - "Community 3"
Cohesion: 0.13
Nodes (10): formatTimeLabel(), onPickCustomArr(), onPickCustomDep(), onPublish(), parseSlotDateTime(), applyRoute(), closePickers(), reverseRoute() (+2 more)

### Community 4 - "Community 4"
Cohesion: 0.18
Nodes (16): BaseModel, CreateRequestIn, GuestPassenger, OfflineSeatsIn, PublishRideIn, Ride, RidePublic, Lazily close rides whose departure time has passed.     - ride.status: published (+8 more)

### Community 5 - "Community 5"
Cohesion: 0.12
Nodes (17): Notification, list_notifications(), mark_all_read(), mark_read(), Return all notifications for the given phone, newest first., Return all notifications for the given phone, newest first., Persist a notification to MongoDB so the user can read it in the     in-app inbo, Return the number of unread notifications for the given phone. (+9 more)

### Community 6 - "Community 6"
Cohesion: 0.23
Nodes (8): formattedPhone(), me(), onSelectRole(), quickSignIn(), sendOtp(), signInWithGoogle(), verifyOtp(), loadGoogleSignInNative()

### Community 7 - "Community 7"
Cohesion: 0.17
Nodes (5): useAuth(), BellIcon(), DriverNotifications(), PassengerNotifications(), useNotifications()

### Community 8 - "Community 8"
Cohesion: 0.38
Nodes (4): request(), statusOf(), submitRequest(), toggleSeat()

### Community 9 - "Community 9"
Cohesion: 0.29
Nodes (1): MainApplication

### Community 10 - "Community 10"
Cohesion: 0.33
Nodes (1): MainActivity

### Community 11 - "Community 11"
Cohesion: 0.53
Nodes (4): buildBaseCandidates(), getHostIpBase(), normalizeBase(), req()

### Community 12 - "Community 12"
Cohesion: 0.6
Nodes (3): comingSoon(), confirmLogout(), savePersonal()

### Community 13 - "Community 13"
Cohesion: 0.4
Nodes (0): 

### Community 14 - "Community 14"
Cohesion: 0.5
Nodes (0): 

### Community 15 - "Community 15"
Cohesion: 0.5
Nodes (0): 

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
Nodes (0): 

### Community 42 - "Community 42"
Cohesion: 1.0
Nodes (0): 

### Community 43 - "Community 43"
Cohesion: 1.0
Nodes (1): Ensure critical indexes exist for booking/ride integrity and query performance.

### Community 44 - "Community 44"
Cohesion: 1.0
Nodes (1): Returns True when departure is more than 30 minutes away (IST).

## Knowledge Gaps
- **18 isolated node(s):** `Ensure critical indexes exist for booking/ride integrity and query performance.`, `Attach seats_left and strip the MongoDB _id field.`, `Convert date + 12-hour departure text into a comparable datetime.`, `Return True when cancellation is allowed by the 30-minute cutoff rule.`, `Generate a short human-readable booking reference.` (+13 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 20`** (2 nodes): `onChipSelect()`, `index.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 21`** (2 nodes): `cancel()`, `bookings.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 22`** (2 nodes): `cancel()`, `[id].tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 23`** (2 nodes): `moveDirectories()`, `reset-project.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 24`** (2 nodes): `Card()`, `Card.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 25`** (2 nodes): `timeAgo()`, `NotificationsScreen.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 26`** (2 nodes): `LoadingSpinner()`, `LoadingSpinner.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 27`** (2 nodes): `Button()`, `Button.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 28`** (2 nodes): `EmptyState()`, `EmptyState.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 29`** (2 nodes): `useVehicles.ts`, `useVehicles()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 30`** (1 nodes): `expo-env.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 31`** (1 nodes): `metro.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 32`** (1 nodes): `babel.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 33`** (1 nodes): `eslint.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 34`** (1 nodes): `_layout.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 35`** (1 nodes): `+html.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 36`** (1 nodes): `rides.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 37`** (1 nodes): `theme.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 38`** (1 nodes): `Badge.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 39`** (1 nodes): `__init__.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 40`** (1 nodes): `server.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 41`** (1 nodes): `__init__.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 42`** (1 nodes): `__init__.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 43`** (1 nodes): `Ensure critical indexes exist for booking/ride integrity and query performance.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 44`** (1 nodes): `Returns True when departure is more than 30 minutes away (IST).`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `get_db()` connect `Community 2` to `Community 1`, `Community 5`, `Community 6`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **Why does `me()` connect `Community 6` to `Community 1`, `Community 2`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Why does `Notification` connect `Community 5` to `Community 2`, `Community 4`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Are the 26 inferred relationships involving `get_db()` (e.g. with `get_current_user()` and `send_notification()`) actually correct?**
  _`get_db()` has 26 INFERRED edges - model-reasoned connections that need verification._
- **Are the 14 inferred relationships involving `Notification` (e.g. with `Persist a notification to MongoDB so the user can read it in the     in-app inbo` and `Return all notifications for the given phone, newest first.`) actually correct?**
  _`Notification` has 14 INFERRED edges - model-reasoned connections that need verification._
- **Are the 6 inferred relationships involving `auto_mark_departed_rides()` (e.g. with `get_db()` and `is_departed()`) actually correct?**
  _`auto_mark_departed_rides()` has 6 INFERRED edges - model-reasoned connections that need verification._
- **Are the 9 inferred relationships involving `User` (e.g. with `Return all seeded demo accounts in a fixed display order.` and `seed_demo()`) actually correct?**
  _`User` has 9 INFERRED edges - model-reasoned connections that need verification._