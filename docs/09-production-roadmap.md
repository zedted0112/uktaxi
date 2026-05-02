# UKTaxi — Production Roadmap

Current state: core ride/booking/notification flow is working end-to-end.
This document lists the remaining work to ship a production Android app.

---

## Phase 1 — Store Packaging (1–2 days)

The fastest phase. None of this touches business logic.

### 1.1 App Identity (`frontend/app.json`)

- Change `name` from `"frontend"` to `"UKTaxi"` (or short brand name)
- Change `slug` from `"frontend"` to `"uktaxi"`
- Change `scheme` from `"frontend"` to `"uktaxi"`
- Add `android.package`: `"com.uktaxi.app"` (unique reverse-domain ID for Play Store)
- Add `android.versionCode`: `1`
- Add `version`: `"1.0.0"` (semantic, shown in Play listing)

### 1.2 App Icon and Splash

- Replace `assets/images/icon.png` with real branded 1024×1024 PNG
- Replace `assets/images/adaptive-icon.png` with Android adaptive foreground layer
- Replace `assets/images/splash-icon.png` with launch screen asset
- Update `splash backgroundColor` in `app.json` to brand colour

### 1.3 EAS Build Setup

Create `frontend/eas.json`:

```json
{
  "cli": { "version": ">= 12.0.0" },
  "build": {
    "preview": {
      "android": { "buildType": "apk" }
    },
    "production": {
      "android": { "buildType": "app-bundle" }
    }
  },
  "submit": {
    "production": {}
  }
}
```

Run once: `npx eas build:configure` to link the project to your EAS account.

### 1.4 Backend Domain + TLS

- Deploy FastAPI to a VPS / Railway / Render behind HTTPS
- Set `EXPO_PUBLIC_BACKEND_URL=https://api.uktaxi.app` in `frontend/.env`
- Set `CORS_ORIGINS=https://uktaxi.app` in `backend/.env`
- Remove `localhost` fallbacks from `frontend/src/api.ts` in production build

---

## Phase 2 — Real Authentication (3–5 days)

Currently OTP is `123456` for everyone and the API has no access tokens.

### 2.1 SMS OTP Integration

**Recommended provider:** MSG91 (India, cheap) or Firebase Auth (free tier generous).

Backend changes in `backend/app/routers/auth.py`:

- `POST /auth/request-otp`:
  - Generate random 6-digit OTP
  - Store in MongoDB `otps` collection with `{phone, otp_hash, expires_at}` (TTL index)
  - Send via SMS provider SDK
- `POST /auth/verify-otp`:
  - Look up stored OTP for phone, compare hash, check expiry
  - On success: delete OTP doc, return user + signed JWT

New model `backend/app/models/otp.py`:

```python
class OtpRecord(BaseModel):
    phone: str
    otp_hash: str       # bcrypt hash of the 6-digit code
    expires_at: datetime
    created_at: datetime
```

### 2.2 JWT Issuance

- Add `python-jose` (already in `requirements.txt`) to sign a JWT on successful OTP verify
- Payload: `{ sub: phone, role: user|driver, exp: now+30days }`
- Return token in verify-otp response; store in `AsyncStorage` on frontend

### 2.3 Auth Middleware on Backend

New `backend/app/dependencies.py`:

```python
async def current_user(token: str = Header(...)) -> User:
    # decode JWT, look up user, return or raise 401
```

Apply to all write routes (create request, publish ride, confirm, cancel).
Read-only public routes (list rides) can remain open.

### 2.4 Frontend Token Plumbing

In `frontend/src/auth.tsx`:
- Store `{ user, token }` in AsyncStorage instead of just `user`
- Pass `Authorization: Bearer <token>` header in `frontend/src/api.ts` `req()` function

---

## Phase 3 — Complete the UI (2–3 days)

### 3.1 Profile Screens

`frontend/app/(tabs)/profile.tsx` — wire up the four menu rows:

| Row | Target screen |
|-----|---------------|
| Personal Details | Edit name (call `PATCH /auth/me`) |
| Help & Support | Static FAQ / WhatsApp deep link |
| Notification Settings | Toggle for in-app badge |
| Sign Out | Already works |

### 3.2 Home Date Filter

`frontend/app/(tabs)/index.tsx` — the "All dates" chip should open a date picker and pass `date` to `api.listRides()`.

### 3.3 Driver Profile Edit

`frontend/app/(driver)/profile.tsx` — allow driver to update vehicle number / type via `api.updateDriverVehicle()`.

---

## Phase 4 — Operations (1–2 days)

### 4.1 Privacy Policy and Data Safety

Play Store requires:
- A publicly hosted Privacy Policy URL
- Completion of the Data Safety form (you collect phone numbers and location intent)

### 4.2 Rate Limiting and Abuse Prevention

Add to FastAPI (use `slowapi` package):
- OTP request: max 3 per phone per 10 minutes
- Register: max 5 per IP per hour


### 4.4 MongoDB Atlas Indexes

Add indexes for query performance:

```javascript
db.rides.createIndex({ date: 1, from_city: 1, to_city: 1, status: 1 })
db.requests.createIndex({ ride_id: 1, status: 1 })
db.requests.createIndex({ user_phone: 1 })
db.requests.createIndex({ driver_phone: 1 })
db.notifications.createIndex({ recipient_phone: 1, read: 1 })
db.otps.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 })
```

---

## Phase 5 — Play Store Submission (1 day)

1. Run `npx eas build --platform android --profile production`
2. Download the `.aab` from EAS dashboard
3. Create Play Console listing:
   - App name, short/full description
   - Screenshots (at least 2 phone screenshots)
   - Feature graphic (1024×500)
   - Privacy Policy URL
4. Complete Data Safety questionnaire
5. Submit for review (typically 1–7 days for new apps)

---

## Optional — Payments (1–2 weeks, post-launch)

Payments are not required for an MVP launch if the model is cash-on-ride.

If you want in-app payment:
- **Razorpay** or **PhonePe** SDK for UPI
- Add `payment_status` field to `BookingRequest` model
- Add `POST /requests/{id}/pay` endpoint
- Show payment screen after seat selection, before confirming

---

## Summary Checklist

| # | Task | Phase | Effort |
|---|------|-------|--------|
| 1 | App name, bundle ID, version in `app.json` | 1 | 30 min |
| 2 | Real app icon and splash | 1 | 2 hrs |
| 3 | `eas.json` + EAS account link | 1 | 1 hr |
| 4 | Backend HTTPS deployment | 1 | 2–4 hrs |
| 5 | Real SMS OTP (MSG91 / Firebase) | 2 | 1 day |
| 6 | JWT issuance and verification | 2 | 1 day |
| 7 | API auth middleware + frontend token | 2 | 1 day |
| 8 | Profile screens | 3 | 1 day |
| 9 | Home date filter | 3 | 2 hrs |
| 10 | Rate limiting | 4 | 2 hrs |
| 11 | MongoDB Atlas indexes | 4 | 1 hr |
| 12 | Privacy policy + Data Safety form | 4 | 2 hrs |
| 14 | EAS production build + Play submission | 5 | 2 hrs |

**Total estimated effort: 8–12 focused working days.**
