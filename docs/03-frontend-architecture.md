# UKTaxi Frontend Architecture

## Frontend Scope
The frontend is an Expo Router app that supports two roles:
- Passenger (`user`)
- Driver (`driver`)

Role controls navigation, available screens, and allowed actions.

## Directory Structure
```
frontend/
  app/                         # Expo Router file-based routes
    _layout.tsx                # Root shell, font loading, auth gate
    auth.tsx                   # Multi-step auth + onboarding flow
    (tabs)/                    # Passenger tab group
      _layout.tsx              # Passenger tab bar (Home, Bookings, Alerts, Profile)
      index.tsx                # Ride search and listing
      bookings.tsx             # Passenger booking history
      notifications.tsx        # Passenger notification inbox
      profile.tsx              # Passenger profile
    (driver)/                  # Driver tab group
      _layout.tsx              # Driver tab bar (Publish, Rides, Requests, Alerts, Profile)
      publish.tsx              # Ride publishing form
      rides.tsx                # Driver's ride history
      requests.tsx             # Incoming booking requests
      notifications.tsx        # Driver notification inbox
      profile.tsx              # Driver profile
    ride/[id].tsx              # Shared ride detail (role-sensitive actions)
    ticket/[id].tsx            # Booking ticket view
  src/
    api.ts                     # Typed API client with dynamic URL resolution
    auth.tsx                   # Auth context (AuthProvider, useAuth)
    theme.ts                   # Color/font/radius design tokens
    SeatMap.tsx                # Seat grid rendering component
    hooks/
      useRides.ts              # Rides data fetching hook
      useRequests.ts           # Booking requests hook
      useVehicles.ts           # Vehicle catalog hook
      useNotifications.ts      # Notification inbox + unread badge hook
    components/
      NotificationsScreen.tsx  # Shared notification inbox UI (used by both roles)
      LoadingSpinner.tsx
      EmptyState.tsx
      Badge.tsx
      Card.tsx
      Button.tsx
    utils/
      date.ts                  # Date formatting helpers
      phone.ts                 # Phone number normalization
      seat.ts                  # Seat number helpers
```

## Navigation Model
### Route groups
- `/auth`: multi-step login + onboarding
- `/(tabs)`: passenger tabs (`index`, `bookings`, `notifications`, `profile`)
- `/(driver)`: driver tabs (`publish`, `rides`, `requests`, `notifications`, `profile`)
- Shared detail routes: `/ride/[id]`, `/ticket/[id]`

### Route gate behavior (`app/_layout.tsx`)
- No user in session → redirect to `/auth`
- Signed-in driver opening passenger area → redirect to `/(driver)/publish`
- Signed-in passenger opening driver area → redirect to `/(tabs)`

## Authentication and Session Flow
- Session key: `utk_auth_v1` in AsyncStorage.
- On app load:
  1. Read cached user from storage.
  2. Attempt `api.me(phone)` to refresh.
  3. Fall back to cached user if refresh fails.
- `signIn(user)`: writes to storage and updates context.
- `signOut()`: clears storage and context.

## Auth Screen Flow (`app/auth.tsx`)
The auth screen is a multi-step flow controlled by a `Step` state:

```
role_select → phone → otp → onboard_driver (4 sub-steps) or onboard_passenger
```

- **role_select**: Choose Driver or Passenger. Demo quick-login toggle shown here.
- **phone**: Enter phone number. Role pill shown in header.
- **otp**: Enter 6-digit code (demo: `123456`). On verify:
  - Existing user → `signIn()` directly.
  - New user → redirect to onboarding step.
- **onboard_driver**: 4 sub-steps: name → vehicle type → plate number → review → `api.register()`.
- **onboard_passenger**: Single name input → `api.register()`.

## Hooks Layer (`src/hooks/`)
Each hook encapsulates fetch, loading state, error state, and refresh for its domain.

| Hook | Purpose |
|---|---|
| `useRides` | Fetch rides list with optional filters |
| `useRequests` | Fetch booking requests by user or driver phone |
| `useVehicles` | Fetch vehicle catalog |
| `useNotifications` | Fetch notification list, unread count; poll every 30s; mark-read actions |

Screens call hooks rather than calling `api.*` directly.

## Components Layer (`src/components/`)
Reusable UI elements with consistent styling:

| Component | Purpose |
|---|---|
| `NotificationsScreen` | Full notification inbox — shared between passenger and driver |
| `LoadingSpinner` | Centered spinner with brand color |
| `EmptyState` | Icon + title + subtitle for empty list states |
| `Badge` | Status pill (pending, confirmed, etc.) |
| `Card` | Surface container with border and shadow |
| `Button` | Primary / outline button variants |

## Notification System (Frontend)
- Both tab layouts (`(tabs)/_layout.tsx` and `(driver)/_layout.tsx`) render a `BellIcon` tab that:
  - Calls `useNotifications(user.phone)` to get the live `unreadCount`
  - Shows a green badge number when `unreadCount > 0`
- The `notifications.tsx` screens in each group render the shared `NotificationsScreen` component.
- Tapping a notification row calls `markRead(id)`, which updates badge count immediately.
- `markAllRead()` button in the inbox header clears all unread.
- The hook polls every 30 seconds to pick up new notifications.

## API Integration Pattern (`src/api.ts`)
- All backend calls go through `src/api.ts`.
- **Dynamic URL resolution** — tries candidates in order:
  1. `EXPO_PUBLIC_BACKEND_URL` from `.env`
  2. Expo host IP from `Constants.expoConfig.hostUri` (device auto-detection)
  3. `10.0.2.2:{port}` (Android emulator localhost)
  4. `localhost:{port}`
- Shared request helper adds JSON content header and throws `Error` with backend `detail` on non-2xx.

## UI System (`src/theme.ts`)
Tokenized design system:
- Semantic color palette (`colors.green`, `colors.bg`, `colors.surface`, etc.)
- Font family aliases (`fonts.heading`, `fonts.bodySemiBold`, etc.)
- Radius scale (`radii.sm`, `radii.md`, `radii.lg`, `radii.xl`, `radii.full`)

## State and Data Refresh Strategy
- Screen-level state via React hooks.
- Data fetching delegated to `src/hooks/` — screens call `refresh()` on focus.
- Notification badge count auto-refreshes on 30-second interval without user action.
- No global query cache library.
