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
2. Run backend and frontend locally.
3. Sign in using a demo account and execute one passenger and one driver flow.
4. Inspect Mongo collections after actions to understand data mutations.

## Core Product Flows to Learn First
### Passenger flow
- Login/register
- Browse rides by route
- Create request
- View/cancel ticket

### Driver flow
- Login/register with vehicle
- Publish ride with offline seats
- Review requests
- Confirm/reject request
- Cancel ride

## Contribution Workflow
1. Pull latest main branch.
2. Create feature branch (`feature/<short-name>`).
3. Implement with small focused commits.
4. Run lint/tests before opening PR.
5. Write PR notes:
   - what changed
   - why it changed
   - test evidence

## Change Impact Checklist
Before merging, verify:
- API contract changes are reflected in `frontend/src/api.ts`.
- Role gating still behaves correctly (`app/_layout.tsx`).
- Request and ride status transitions are not broken.
- Seat rules remain consistent (`booked_seats` vs `offline_seats`).
- No generated artifacts (cache files) are included accidentally.

## Feature Development Playbook
### If adding a new frontend screen
- Add route under correct group (`(tabs)` or `(driver)`).
- Integrate with existing theme tokens and test IDs.
- Use centralized API client rather than raw fetch calls in screen files.

### If adding a backend endpoint
- Add Pydantic input/output models.
- Enforce business validation with explicit HTTP errors.
- Update API docs (`docs/05-api-reference.md`) and data model docs if schema changes.

### If changing booking logic
- Validate all edge cases:
  - pending conflicts
  - confirmed seat duplication
  - cancellation cutoffs
  - ride cancellation cascading

## Testing Expectations
Minimum for each non-trivial change:
- Frontend: lint clean (`yarn lint`)
- Backend: API tests (`pytest -q`)
- Manual smoke:
  - passenger booking request path
  - driver confirm/reject path
  - cancellation behavior

## Documentation Maintenance Rule
When implementation changes, update relevant docs in same PR:
- API changes -> `docs/05-api-reference.md`
- schema/state changes -> `docs/06-data-model.md`
- setup/tooling changes -> `docs/07-local-development-runbook.md`
- architectural changes -> `docs/02-system-architecture.md`, `docs/03-*`, `docs/04-*`

## Current Technical Debt to Watch
- Monolithic backend file (`backend/server.py`).
- Seat confirmation race risks under concurrent traffic.
- Demo seeding behavior can wipe data when schema version changes.
- Unused Python dependencies increase backend install footprint.
