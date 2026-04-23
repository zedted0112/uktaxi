# UKTaxi Onboarding and Contribution Guide

## Purpose
This guide helps a new developer become productive quickly and ship safe changes across frontend and backend.

## Day 1 Onboarding Path
1. Read docs in order:
   - `docs/01-tech-stack.md`
   - `docs/02-system-architecture.md`
   - `docs/03-frontend-architecture.md`
   - `docs/04-backend-architecture.md`
   - `docs/05-api-reference.md`
   - `docs/06-data-model.md`
   - `docs/07-local-development-runbook.md`
   - `docs/09-production-roadmap.md`
2. Follow the runbook and get both services running locally.
3. Sign in using a demo account and execute one passenger and one driver flow.
4. Create a seat request as a passenger, then confirm it as the driver.
5. Check the Alerts (bell) tab on both sides to see notifications appear.
6. Inspect MongoDB `notifications` collection after actions to understand the data.

## Core Product Flows to Learn First

### Passenger flow
- Role select → phone → OTP → register name
- Browse rides by route (Home tab)
- Create request (Ride Detail screen)
- View ticket (Bookings tab)
- Check notifications (Alerts tab)
- Cancel ticket

### Driver flow
- Role select → phone → OTP → register name, vehicle type, plate
- Publish ride with offline seats (Publish tab)
- Review requests (Requests tab)
- Confirm/reject request
- Check notifications (Alerts tab)
- Cancel ride

## Key Files to Understand First

### Frontend
| File | Why |
|---|---|
| `frontend/app/_layout.tsx` | Auth gate and role-based redirect logic |
| `frontend/app/auth.tsx` | Multi-step onboarding flow with all step logic |
| `frontend/src/api.ts` | All API calls and TypeScript types |
| `frontend/src/auth.tsx` | Auth context, session persistence |
| `frontend/src/hooks/useNotifications.ts` | Notification polling and badge logic |
| `frontend/src/theme.ts` | Design tokens — always use these for styling |

### Backend
| File | Why |
|---|---|
| `backend/app/main.py` | App setup, router registration |
| `backend/app/routers/requests.py` | Core booking logic with notification triggers |
| `backend/app/routers/rides.py` | Ride publish, cancel, cascade notification |
| `backend/app/notifications.py` | Single place for all notification writes |
| `backend/app/helpers.py` | Business rule helpers (seat validation, cancel cutoff) |

## Contribution Workflow
1. Pull latest `main` branch.
2. Create feature branch (`feature/<short-name>`).
3. Implement with small focused commits.
4. Run lint/tests before opening PR:
   - `yarn lint` (frontend)
   - `pytest -q` (backend)
5. Write PR notes: what changed, why, and test evidence.

## Change Impact Checklist
Before merging, verify:
- API contract changes reflected in `frontend/src/api.ts` and `docs/05-api-reference.md`.
- New backend endpoints registered in `backend/app/main.py`.
- Role gating still behaves correctly (`app/_layout.tsx`).
- Request and ride status transitions are not broken.
- Seat rules remain consistent (`booked_seats` vs `offline_seats`).
- If a booking action was added: does it call `send_notification()`?
- No generated artifacts (cache files, `.env`) in commits.

## Feature Development Playbook

### Adding a new frontend screen
- Add route file under correct group: `(tabs)/` for passenger, `(driver)/` for driver.
- Use design tokens from `src/theme.ts` for all styling.
- Add `testID` to interactive elements.
- Create a hook in `src/hooks/` if screen needs data fetching.
- Use the hook in the screen — never call `api.*` directly from screen files.

### Adding a backend endpoint
- Add Pydantic input/output model in the appropriate `app/models/` file.
- Add route in the appropriate `app/routers/` file.
- Register the router in `app/main.py` if it's a new file.
- Enforce business validation with explicit `HTTPException`.
- If the action triggers a notification, `await send_notification(...)` before returning.
- Update `docs/05-api-reference.md`.

### Adding a new notification type
- Add the event type string to `docs/06-data-model.md` notification types table.
- Call `await send_notification(recipient_phone=..., title=..., body=..., data={"type": "..."})` in the router.
- Add the icon mapping in `frontend/src/components/NotificationsScreen.tsx` `TYPE_ICON` constant.

### Changing booking logic
- Validate all edge cases:
  - pending seat conflicts
  - confirmed seat duplication
  - cancellation cutoffs
  - ride cancellation cascading
  - notification delivery to correct recipient

## Testing Expectations
Minimum for each non-trivial change:
- Frontend: `yarn lint` passes clean
- Backend: `pytest -q` passes
- Manual smoke:
  - Full passenger booking request path
  - Driver confirm and reject paths
  - Cancellation behavior (both sides)
  - Notification appears in bell tab within 30 seconds

## Documentation Maintenance Rule
Update docs in the same PR as the code:
- API changes → `docs/05-api-reference.md`
- Schema/data changes → `docs/06-data-model.md`
- Setup/tooling changes → `docs/07-local-development-runbook.md`
- Architectural changes → `docs/02-system-architecture.md`, `docs/03-*`, `docs/04-*`

## Current Technical Debt to Watch
- Seat confirmation race risk under concurrent traffic (no DB transactions).
- Demo seeding is destructive when `SCHEMA_VERSION` bumps — guard before enabling in production.
- API auth is trust-based on phone identity — no JWT/session tokens yet (see `docs/09-production-roadmap.md`).
- 30-second notification polling introduces delivery latency — acceptable for MVP, upgrade to WebSocket for v2.
