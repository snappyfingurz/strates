# Strates — AI Coding Conventions & System Specification

## 1. Project Overview
Strates is a high-performance nutrition tracking and workout logging PWA for gym-goers. It uses Next.js 16 (App Router) + TypeScript + MongoDB (Atlas / Mongoose) + Custom JWT Auth (httpOnly cookies) + MongoDB GridFS (file storage) + Tailwind CSS v4.

---

## 2. Architecture Rules
- **App Router**: All pages under `src/app/`. Authenticated routes under `src/app/(authenticated)/`.
- **Server Components by default**: Use `'use client'` only when the component needs interactivity (forms, state, browser hooks).
- **Server Actions & Route Handlers**: Mutations use `'use server'` actions co-located with routes or API routes (`src/app/api/`) where appropriate (e.g. authenticated file streaming).
- **Business logic**: Pure functions in `src/lib/` — zero database or network dependencies. Must have Vitest unit tests.
- **Database connection**: Cached Mongoose connection helper in `src/lib/db.ts` safe for serverless hot reloads.
- **File Storage**: MongoDB GridFS bucket for photos. Never publicly exposed; served via authenticated endpoint `/api/files/[id]`.

---

## 3. Technology Stack
- **Framework**: Next.js 16 (App Router, Turbopack, Server Actions)
- **Database**: MongoDB (Atlas) via Mongoose ODM
- **File Storage**: MongoDB GridFS (no external S3 or cloud bucket needed)
- **Authentication**: Custom-built JWT auth using signed tokens (via `jose` / `jsonwebtoken`) in httpOnly, Secure, SameSite=Lax cookies, with passwords hashed using `bcrypt` (cost factor 12)
- **Validation**: Zod (for all API/Action inputs, forms, and environment variables)
- **Styling**: Tailwind CSS v4 with dark gym aesthetic and glassmorphism
- **Charts & Visualization**: Recharts
- **Testing**: Vitest (pure business logic, similarity matching, security rules)

---

## 4. Data Model (Mongoose Schemas & Collections)

Every collection is defined as a typed Mongoose schema with timestamps and required validation:

### 4.1 `User` (`users`)
- `_id`: ObjectId
- `email`: String (lowercase, trim, unique index, required)
- `passwordHash`: String (required, bcrypt cost 12)
- `displayName`: String (required, trim)
- `role`: String (enum: `['user', 'admin']`, default: `'user'`). Users cannot modify their own role.
- `createdAt`, `updatedAt`: Date

### 4.2 `Profile` (`profiles`)
- `userId`: ObjectId (ref: `User`, unique index, required)
- `sex`: String (enum: `['male', 'female']`, optional)
- `birthYear`: Number (min: 1900, max: current year, optional)
- `heightCm`: Number (min: 50, max: 300, optional)
- `activityLevel`: String (enum: `['sedentary', 'light', 'moderate', 'active']`, optional)
- `goal`: String (enum: `['cut', 'maintain', 'bulk']`, optional)
- `unitSystem`: String (enum: `['metric', 'imperial']`, default: `'metric'`)
- `createdAt`, `updatedAt`: Date

### 4.3 `Food` (`foods`)
- `ownerId`: ObjectId (ref: `User`, optional - null for global catalog items)
- `name`: String (required, trim, indexed)
- `normalizedName`: String (required, trim, lowercase for fast similarity searching)
- `brand`: String (optional, trim)
- `barcode`: String (optional, indexed sparse)
- `kcal100g`: Number (min: 0, max: 900, required)
- `protein100g`: Number (min: 0, max: 100, required)
- `carbs100g`: Number (min: 0, max: 100, required)
- `fat100g`: Number (min: 0, max: 100, required)
- `fiber100g`: Number (min: 0, max: 100, optional)
- `sugar100g`: Number (min: 0, max: 100, optional)
- `servingG`: Number (min: 1, optional)
- `source`: String (enum: `['barcode', 'label_scan', 'manual']`, default: `'manual'`)
- `createdAt`, `updatedAt`: Date

### 4.4 `FoodLog` (`food_logs`)
- `userId`: ObjectId (ref: `User`, required, indexed)
- `foodId`: ObjectId (ref: `Food`, required)
- `loggedOn`: String (format: YYYY-MM-DD, required, indexed)
- `meal`: String (enum: `['breakfast', 'lunch', 'dinner', 'snack']`, required)
- `quantityG`: Number (min: 0.1, max: 10000, required)
- **Snapshot fields (frozen at log time)**:
  - `kcal`: Number (required)
  - `protein`: Number (required)
  - `carbs`: Number (required)
  - `fat`: Number (required)
- `clientId`: String (required)
- Compound unique index: `{ userId: 1, clientId: 1 }` (enforces idempotency)
- Index: `{ userId: 1, loggedOn: 1 }`

### 4.5 `BodyWeight` (`body_weights`)
- `userId`: ObjectId (ref: `User`, required)
- `measuredOn`: String (format: YYYY-MM-DD, required)
- `weightKg`: Number (min: 20, max: 500, required)
- Compound unique index: `{ userId: 1, measuredOn: 1 }`

### 4.6 `DailyTarget` (`daily_targets`)
- `userId`: ObjectId (ref: `User`, required)
- `effectiveFrom`: String (format: YYYY-MM-DD, required)
- `kcal`: Number (required)
- `proteinG`: Number (required)
- `reason`: String (default: `'initial'`)
- Index: `{ userId: 1, effectiveFrom: -1 }`

### 4.7 `Equipment` (`equipment`)
- `name`: String (required, trim)
- `normalizedName`: String (required, trim, lowercase)
- `muscleGroup`: String (required, trim)
- `fileId`: ObjectId (optional GridFS file id for image)
- `status`: String (enum: `['pending', 'approved', 'rejected']`, default: `'pending'`, indexed)
- `submittedBy`: ObjectId (ref: `User`, required)
- `reviewedBy`: ObjectId (ref: `User`, optional)
- `reviewNote`: String (optional)
- `createdAt`, `updatedAt`: Date

### 4.8 `Exercise` (`exercises`)
- `name`: String (required, trim)
- `muscleGroup`: String (required, trim)
- `equipmentId`: ObjectId (ref: `Equipment`, optional)
- `ownerId`: ObjectId (ref: `User`, optional - null for standard library)
- `repRangeLow`: Number (default: 8)
- `repRangeHigh`: Number (default: 12)
- `createdAt`, `updatedAt`: Date

### 4.9 `WorkoutSession` (`workout_sessions`)
- `userId`: ObjectId (ref: `User`, required, indexed)
- `startedAt`: Date (default: Date.now, required)
- `endedAt`: Date (optional)
- `notes`: String (optional)
- `createdAt`: Date

### 4.10 `WorkoutSet` (`workout_sets`)
- `sessionId`: ObjectId (ref: `WorkoutSession`, required, indexed)
- `userId`: ObjectId (ref: `User`, required, indexed)
- `exerciseId`: ObjectId (ref: `Exercise`, required, indexed)
- `setNo`: Number (required)
- `weightKg`: Number (min: 0, required)
- `reps`: Number (min: 1, required)
- `rpe`: Number (min: 1, max: 10, optional)
- `isWarmup`: Boolean (default: false)
- `est1RM`: Number (calculated via Epley/Brzycki)
- `isPR`: Boolean (default: false)
- `clientId`: String (required)
- Compound unique index: `{ userId: 1, clientId: 1 }` (enforces idempotency)

### 4.11 `AuditLog` (`audit_logs`)
- `actorId`: ObjectId (ref: `User`, required, indexed)
- `action`: String (required)
- `entity`: String (required)
- `entityId`: ObjectId (required)
- `details`: Object (optional)
- `createdAt`: Date (default: Date.now)

### 4.12 `AuthAttempt` (`auth_attempts`) — Rate Limiting
- `key`: String (required, e.g. `ip:xxx` or `email:xxx`)
- `attempts`: Number (default: 1)
- `createdAt`: Date (default: Date.now, expires after 900 seconds / 15 minutes TTL index)

---

## 5. Custom Auth & Strict Authorization

### 5.1 Custom Authentication
- **Password Hashing**: `bcrypt` with cost factor 12. Plain passwords never stored or logged.
- **Session Tokens**: JWT signed using `jose` with HS256 and secret `JWT_SECRET`. 7-day expiration.
- **Cookie Security**: Token stored in `auth_token` cookie with flags: `httpOnly: true`, `secure: process.env.NODE_ENV === 'production'`, `sameSite: 'lax'`, `path: '/'`, `maxAge: 7 * 24 * 60 * 60`.
- **Generic Errors**: Failed login returns "Invalid email or password" to prevent user enumeration.
- **Brute-Force Rate Limiting**: Max 5 attempts per 15 minutes per IP/email backed by MongoDB `auth_attempts` with a TTL index.
- **Email Verification**: Skipped for now.

### 5.2 Strict Server-Side Authorization (Replaces RLS)
- Core helper in `src/lib/auth.ts`:
  - `getSession()`: extracts and verifies JWT token from cookies, fetches verified user from MongoDB.
  - `requireUser()`: throws/redirects if unauthenticated; returns verified `{ userId, email, role, displayName }`.
  - `requireAdmin()`: verifies session AND asserts `role === 'admin'`.
- **Never Trust Client Identifiers**: `userId` is strictly pulled from the verified session object, NEVER from request bodies, parameters, or query strings.
- **Ownership Scoping**: All mutations and queries on user-specific resources (`food_logs`, `body_weights`, `daily_targets`, `workout_sessions`, `workout_sets`) filter by `{ _id, userId }`.
- **404 Over 403 on Missing Objects**: When fetching by ID, querying by `{ _id, userId }` returns a 404 if not found to avoid leaking whether another user's document exists.
- **Equipment Access Control**:
  - `approved` equipment is readable by any logged-in user.
  - `pending` / `rejected` equipment is readable only by the submitter or an admin.
  - Submissions from users are forced to status `pending` on the server.
  - Only `requireAdmin()` can approve or reject equipment, logging to `audit_logs`.

---

## 6. Business Logic & Testing

- **Nutrition**: Portion scaling, macro sum check, Atwater calculations ($4\text{P} + 4\text{C} + 9\text{F}$), discrepancy alerts.
- **Targets**: Mifflin-St Jeor equation (BMR), activity multiplier (TDEE), goal-based calorie adjustment (Cut $-500$, Bulk $+300$) and protein per kg.
- **Workout**: 1RM calculation (Epley & Brzycki formulas), PR detection against user's historical best, progressive overload guidance, working volume.
- **Equipment Name Matching**: Pure function in `src/lib/similarity.ts` implementing normalized trigram / Levenshtein similarity (with unit tests).
- **Automated Security Tests**: Vitest suite verifying:
  - User A cannot access or mutate User B's logs.
  - Normal users cannot access admin endpoints.
  - Users cannot promote themselves to admin.
  - Client-supplied `userId` is ignored in favor of the session `userId`.

---

## 7. File Structure
```
src/
├── app/
│   ├── (authenticated)/
│   │   ├── dashboard/page.tsx
│   │   ├── foods/page.tsx
│   │   ├── workouts/page.tsx
│   │   ├── profile/page.tsx
│   │   └── admin/page.tsx
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login/route.ts
│   │   │   ├── register/route.ts
│   │   │   └── logout/route.ts
│   │   └── files/
│   │       └── [id]/route.ts       # Authenticated GridFS streaming
│   ├── login/page.tsx
│   ├── signup/page.tsx
│   ├── globals.css
│   └── layout.tsx
├── lib/
│   ├── db.ts                       # Cached Mongoose connection
│   ├── gridfs.ts                   # GridFS upload & stream helpers
│   ├── auth.ts                     # JWT sign/verify, getSession, requireUser, requireAdmin
│   ├── rate-limit.ts               # Mongo-backed auth rate limiter
│   ├── models/                     # Mongoose models
│   │   ├── User.ts
│   │   ├── Profile.ts
│   │   ├── Food.ts
│   │   ├── FoodLog.ts
│   │   ├── BodyWeight.ts
│   │   ├── DailyTarget.ts
│   │   ├── Equipment.ts
│   │   ├── Exercise.ts
│   │   ├── WorkoutSession.ts
│   │   ├── WorkoutSet.ts
│   │   ├── AuditLog.ts
│   │   └── AuthAttempt.ts
│   ├── schemas.ts                  # Zod validation schemas
│   ├── similarity.ts               # Trigram / Levenshtein text similarity
│   ├── nutrition.ts                # Pure nutrition formulas
│   ├── targets.ts                  # Pure BMR / TDEE / target formulas
│   └── workout.ts                  # Pure 1RM & PR formulas
├── scripts/
│   └── seed.ts                     # npm run seed (exercises, equipment, demo user)
└── middleware.ts                   # Edge route protection & cookie checks
```

---

## 8. Dependencies
- `next`, `react`, `react-dom`
- `mongoose`
- `bcrypt`, `@types/bcrypt`
- `jose`
- `sharp` (for metadata stripping & image validation)
- `zod`
- `recharts`
- `tailwindcss` (v4)
- `vitest` (dev)

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
