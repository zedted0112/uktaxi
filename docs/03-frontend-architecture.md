# UKTaxi Frontend Architecture

## Frontend Scope
The frontend is an Expo Router app that supports two roles:
- Passenger (`user`)
- Driver (`driver`)

Role controls navigation, available screens, and allowed actions.

## Directory Landmarks
- `frontend/app/_layout.tsx`: root app shell, font loading, auth gate, route redirects.
- `frontend/app/auth.tsx`: phone OTP + registration + demo quick login.
- `frontend/app/(tabs)/*`: passenger tab area.
- `frontend/app/(driver)/*`: driver tab area.
- `frontend/app/ride/[id].tsx`: shared ride detail view (role-sensitive actions).
- `frontend/app/ticket/[id].tsx`: booking request ticket view.
- `frontend/src/auth.tsx`: auth/session context.
- `frontend/src/api.ts`: typed API contract and network wrapper.
- `frontend/src/SeatMap.tsx`: seat-grid rendering utility.
- `frontend/src/theme.ts`: colors, fonts, spacing/radius tokens.

## Navigation Model
### Route groups
- `/auth`: login + onboarding
- `/(tabs)`: passenger tabs (`index`, `bookings`, `profile`)
- `/(driver)`: driver tabs (`publish`, `rides`, `requests`, `profile`)
- Shared detail routes: `/ride/[id]`, `/ticket/[id]`

### Route gate behavior
Implemented in `app/_layout.tsx`:
- No user in session -> redirect to `/auth`
- Signed-in driver opening passenger area -> redirect to `/(driver)/publish`
- Signed-in passenger opening driver area -> redirect to `/(tabs)`

## Authentication and Session Flow
- Session key: `utk_auth_v1` in AsyncStorage.
- On app load:
  1. Read cached user from storage.
  2. Attempt `api.me(phone)` to refresh.
  3. Fall back to cached user if refresh fails.
- `signIn(user)`: writes to storage and updates context.
- `signOut()`: clears storage and context.

## Screen Responsibilities
### Auth (`app/auth.tsx`)
- Step flow: `phone -> otp -> register`.
- Supports fast demo sign-in (`/api/demo/accounts`).
- Driver registration path includes vehicle preset and vehicle number.

### Passenger tabs
- `index.tsx`:
  - Route chip selection for common city pairs.
  - Fetches rides via `api.listRides`.
  - Opens `/ride/[id]`.
- `bookings.tsx`:
  - Lists passenger booking requests.
  - Opens ticket details.
- `profile.tsx`:
  - Displays user info.
  - Sign-out action.

### Driver tabs
- `publish.tsx`:
  - Collect route/date/time/price.
  - Manage offline seat selections via `SeatMap`.
  - Publish ride using `api.publishRide`.
- `rides.tsx`:
  - List own rides by `driver_phone`.
  - Open ride detail, including cancel flow.
- `requests.tsx`:
  - List incoming booking requests for driver.
  - Confirm/reject actions.
- `profile.tsx`:
  - Driver profile and vehicle details.
  - Vehicle update and sign-out path.

## API Integration Pattern
- All backend calls go through `src/api.ts`.
- Base URL: `process.env.EXPO_PUBLIC_BACKEND_URL` fallback to preview deployment.
- Shared request helper:
  - Adds JSON content header
  - Throws JavaScript `Error` using backend `detail` when non-2xx

## UI System
- Tokenized theme in `src/theme.ts`:
  - semantic color palette
  - font family aliases
  - radii for cards/chips/buttons
- Reusable seat UI in `src/SeatMap.tsx`:
  - maps seat state to visual status
  - supports tap-to-toggle flows for driver offline bookings

## State and Data Refresh Strategy
- Local screen state via React hooks (`useState`, `useMemo`, `useCallback`).
- Screen refresh on focus commonly uses `useFocusEffect`.
- No global query cache library; each screen owns fetch and refresh lifecycle.

## Testability Notes
- Many interactive controls include `testID`.
- Current frontend does not include a configured test runner (unit/E2E not yet wired), but locator coverage is ready for automation onboarding.
