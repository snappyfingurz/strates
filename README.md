# Strates — Nutrition Tracking & Workout Logging PWA

Strates is a high-performance progressive web application tailored for serious gym-goers and athletes. It unifies daily nutritional macro tracking and live workout logging into a single cohesive interface, replacing the need to juggle separate apps.

Built with **Next.js 16 (App Router)**, **TypeScript**, **Tailwind CSS v4**, **MongoDB (Atlas)** with **Mongoose**, **Custom JWT Authentication**, **MongoDB GridFS** file storage, **Zod**, and **Vitest**.

---

## Key Features

- **Performance Dashboard**: Real-time caloric and macronutrient progress bars, meal timing distribution, recent workouts overview, and biometric weigh-in status.
- **Nutrition & Macro Tracking**:
  - Searchable catalog of whole foods and gym staples with macronutrient snapshots per 100g.
  - Live portion calculator displaying instant calorie/macro estimates for any gram weight.
  - Custom food creator with chemical feasibility validation (sum of protein, carbs, fat $\le$ 102g/100g) and automatic Atwater calorie estimation ($4\text{P} + 4\text{C} + 9\text{F}$).
  - Categorized meal breakdown: Breakfast, Lunch, Dinner, Snacks with item deletion and running totals.
  - Idempotent logging enforcing unique compound constraints on `(userId, clientId)`.
- **Workout Logging & PR Detection**:
  - Live session tracking: log sets with exact weight (kg), reps, RPE (Rate of Perceived Exertion 1–10), and warmup indicators.
  - Real-time estimated One-Rep Max (1RM) calculation using the Epley and Brzycki equations.
  - Automatic Personal Record (PR) celebration badge when a new estimated 1RM exceeds all historical records for that exercise.
  - Dynamic progressive overload guidance based on target rep ranges (e.g. suggesting $+2.5\text{kg}$ when topping the rep bracket).
  - Total session volume computation ($\sum \text{weight} \times \text{reps}$, excluding warmups).
- **Biometric Profiles & Target Engine**:
  - Scientific Mifflin-St Jeor equation to compute Basal Metabolic Rate (BMR) from biological sex, age, height, and weight.
  - Total Daily Energy Expenditure (TDEE) calculation based on activity tiers (sedentary, light, moderate, active).
  - Automated calorie & protein targets tailored by fitness goal:
    - **Cut**: $-500\text{ kcal}$ deficit with $2.2\text{g/kg}$ protein to preserve lean tissue.
    - **Maintain**: Energy balance with $2.0\text{g/kg}$ protein.
    - **Bulk**: $+300\text{ kcal}$ surplus with $1.8\text{g/kg}$ protein for hypertrophy.
- **Role-Based Admin Control Center**:
  - Dedicated moderation portal for administrators to inspect community equipment submissions.
  - Approval and rejection workflows with review notes.
  - Immutable audit logging in MongoDB to track administrative actions.
- **GridFS File Storage**:
  - Secure binary file storage directly in MongoDB GridFS.
  - Magic-byte validation (JPEG, PNG, WebP) and server-side re-encoding via `sharp` to strip dangerous EXIF metadata.
  - Private streaming via `/api/files/[id]` enforcing ownership and review status checks.

---

## Tech Stack & Architecture

- **Framework**: Next.js 16 (App Router, Turbopack, Server Actions, Server Components)
- **Language**: TypeScript (strict mode, zero unhandled `any`)
- **Database**: MongoDB (Atlas) via cached Mongoose connection helper (`src/lib/db.ts`)
- **File Storage**: MongoDB GridFS bucket (`uploads`) with authenticated streaming
- **Authentication**: Custom-built JWT system using `jose`, signed with `JWT_SECRET`, stored in `httpOnly`, `Secure`, `SameSite=Lax` cookies
- **Password Security**: `bcrypt` with cost factor 12 (never logged or stored in plaintext)
- **Brute-Force Protection**: IP and email rate limiting backed by MongoDB `auth_attempts` with a 15-minute TTL index
- **Validation**: Zod (domain schemas in `src/lib/schemas.ts`)
- **Styling**: Tailwind CSS v4 with custom dark aesthetic, OKLCH brand palette, glassmorphism, and responsive grid layouts
- **Testing**: Vitest unit & security test suite covering pure business logic and RBAC

---

## Security Model (Replaces RLS)

1. **Session-Driven Identity**:
   - `userId` is strictly pulled from the verified JWT cookie session via `requireUser()` or `requireAdmin()`.
   - Client-sent `userId` values in request bodies, query strings, or URL parameters are completely ignored.
2. **Multi-Tenant Ownership Scoping**:
   - Every mutation and query on user-specific resources (`food_logs`, `body_weights`, `daily_targets`, `workout_sessions`, `workout_sets`) filters by `{ _id, userId }`.
   - If an item is not found or owned by someone else, a 404 is returned (not 403) to prevent leaking the existence of other users' records.
3. **Role-Based Access Control (RBAC)**:
   - User roles (`'user'` | `'admin'`) are stored in MongoDB and verified against the database.
   - Users cannot modify or promote their own role through any form, API, or action.
4. **Anti-Enumeration Login**:
   - Authentication failures return generic error messages ("Invalid email or password").
   - Maximum 5 failed attempts per 15-minute window before temporary lockout.

---

## Directory Structure

```
strates/
├── src/
│   ├── app/
│   │   ├── (authenticated)/         # Protected routes layout & sidebar
│   │   │   ├── dashboard/page.tsx   # Daily macro progress & recent sessions
│   │   │   ├── foods/               # Catalog, portion logging, custom food builder
│   │   │   ├── workouts/            # Live session logger, 1RM, PR detection
│   │   │   ├── profile/             # Biometrics, weigh-ins, TDEE/target engine
│   │   │   └── admin/               # Community moderation & audit trail
│   │   ├── api/
│   │   │   └── files/[id]/route.ts  # Authenticated GridFS file streaming
│   │   ├── auth/actions.ts          # Custom signup, login, and logout actions
│   │   ├── login/page.tsx           # Authentication page
│   │   ├── signup/page.tsx          # Account registration
│   │   ├── globals.css              # Tailwind v4 theme tokens & styles
│   │   └── page.tsx                 # Root redirect
│   ├── lib/
│   │   ├── db.ts                    # Cached Mongoose connection helper
│   │   ├── auth.ts                  # JWT signing/verification, requireUser, requireAdmin
│   │   ├── rate-limit.ts            # MongoDB-backed TTL rate limiter
│   │   ├── gridfs.ts                # GridFS upload, magic bytes check & sharp sanitization
│   │   ├── similarity.ts            # Trigram & Levenshtein equipment matching
│   │   ├── models/                  # Typed Mongoose schemas
│   │   │   ├── User.ts
│   │   │   ├── Profile.ts
│   │   │   ├── Food.ts
│   │   │   ├── FoodLog.ts
│   │   │   ├── BodyWeight.ts
│   │   │   ├── DailyTarget.ts
│   │   │   ├── Equipment.ts
│   │   │   ├── Exercise.ts
│   │   │   ├── WorkoutSession.ts
│   │   │   ├── WorkoutSet.ts
│   │   │   ├── AuditLog.ts
│   │   │   └── AuthAttempt.ts
│   │   ├── schemas.ts               # Zod validation schemas
│   │   ├── nutrition.ts             # Portion scaling & Atwater calculations
│   │   ├── targets.ts               # Mifflin-St Jeor BMR, TDEE, goal target formulas
│   │   └── workout.ts               # 1RM (Epley/Brzycki), PR detection, volume formulas
│   └── middleware.ts                # Edge route protection & cookie checks
├── scripts/
│   └── seed.ts                      # npm run seed (exercises, equipment, demo user)
└── vitest.config.ts                 # Unit & security test suite configuration
```

---

## Environment Variables

Create `.env.local` in the project root:

```env
# MongoDB Connection String
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/strates?retryWrites=true&w=majority

# Custom Auth JWT Secret (long random string)
JWT_SECRET=your-secure-random-32-character-secret-key-here

# Vision LLM (for label scanning)
VISION_LLM_API_KEY=
VISION_LLM_PROVIDER=
VISION_LLM_MODEL=
```

---

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Seed database (creates admin, demo user with 3 weeks of data, exercises, equipment)
npm run seed

# 3. Run unit & security test suite
npm test

# 4. Build for production
npm run build

# 5. Start development server
npm run dev
```

### Seeded Credentials
- **Demo User**: `demo@strates.fit` / `DemoPassword123!`
- **Admin User**: `admin@strates.fit` / `AdminPassword123!`
