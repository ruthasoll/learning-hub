# Project Architecture (as found, 2026-11-19)

Based on direct inspection of the repository. Nothing here is assumed from the SRS; see `REQUIREMENTS_TRACEABILITY.md` for the comparison.

## 1. Stack

| Layer | Technology |
|---|---|
| Framework | TanStack Start (React 19) + TanStack Router (file-based routes) + TanStack Query |
| Build / hosting | Vite 8, Nitro (output also generates Cloudflare/Wrangler config); Lovable-managed |
| UI | Tailwind CSS 4, shadcn/Radix components (`src/components/ui`), lucide icons, sonner toasts, recharts (installed) |
| Forms / validation | react-hook-form, zod (installed; most screens use plain `useState`, little zod validation seen) |
| Backend | **Supabase (Postgres + Auth)** accessed *directly from the browser* with the anon key. No custom API layer |
| Auth | Supabase Auth (email/password + Google via `@lovable.dev/cloud-auth-js`) |
| DB migrations | Plain SQL in `drizzle/migrations/` (drizzle-kit configured but `drizzle/schema.ts` is intentionally empty) |
| Tests | Vitest + Testing Library; **1 test** (home route matches) |

Scripts: `dev`, `build`, `lint`, `test`, `format`. Package managers: both `bun.lock` and `package-lock.json` exist (should pick one).

## 2. How the app works

```
Browser (React, SSR disabled for /_authenticated)
   |  supabase-js (anon/publishable key + user JWT)
   v
Supabase Postgres
   - Row Level Security (RLS) on all 28 tables  <-- the ONLY authorization layer
   - SQL functions (RPC) for business logic: submit_assessment, grade_submission,
     simulate_checkout, refund_payment, verify_parent_link, ...
   - Triggers: course workflow rules, notifications, audit log
```

Key consequence: **security and business rules live in the database (RLS + `security definer` functions), not in server code.** The `src/integrations/supabase/client.server.ts` service-role client exists but nothing currently uses a server function; there are no webhooks, no server routes, no edge functions (`supabase/` contains only `config.toml`).

## 3. Roles and access
- Enum `app_role`: `platform_admin`, `finance_admin`, `instructor`, `student`, `parent` (separate roles, matching the SRS).
- Roles in `user_roles`; helper functions `has_role`, `is_platform_admin`, `is_finance_admin`, `is_parent_of`, `can_edit_course`, `can_see_student`, `can_message`, etc.
- Front-end: `_authenticated` layout redirects unauthenticated users to `/auth`; `RoleGate` (`components/admin-kit.tsx`) hides admin pages from other roles (UI only; real enforcement is RLS).
- Home route per role: `ROLE_HOME` in `lib/session.ts`.

## 4. Database (migration `0000_lms_core_schema.sql`, `0001_message_contacts.sql`)

Groups (28 tables):
- **Academic:** `grade_levels` (Pre-KG..Grade 12, each with default delivery mode: guided for Pre-KG–Grade 4, self-paced after), `subjects`, `academic_periods`
- **Users:** `profiles`, `user_roles`
- **Content:** `courses` (status draft/pending/approved/rejected/published, delivery_mode, live_sessions_enabled, price), `modules`, `lessons`
- **Assessment:** `assessments`, `questions` (mcq / true_false / written), `question_keys` (answer keys in a separate table so students cannot read them), `submissions`, `answers`
- **Commerce:** `price_plans` (course/bundle/term/subscription-style with `billing_interval`), `coupons`, `payments` (provider column, status enum), `refund_requests`, `enrollments`
- **Learning ops:** `lesson_progress`, `live_sessions` (external `meeting_url`), `attendance`, `interventions`
- **Family/comms:** `parent_links` (request → admin verification), `announcements`, `messages`, `notifications`
- **Platform:** `platform_settings` (key/jsonb), `audit_log`

Notable database logic:
- `enforce_course_rules` trigger: instructors can only move courses draft/rejected→pending (and pending→draft); only platform admins approve/reject/publish; finance can only change price on others' courses.
- `submit_assessment`: auto-grades mcq/true_false by case-insensitive string match with the key; written answers wait for manual grading. One attempt per student.
- `grade_submission`: manual marks (clamped to question marks), notifies student.
- `check_performance`: flags low scores and notifies verified parents and the instructor.
- `students_needing_support`: low score / overdue view for instructors, parents, students.
- `preview_checkout` / `simulate_checkout` / `refund_payment` / `decide_refund_request`: payment flow (**simulated**, see Technical Debt).
- `audit_trigger` on courses (status/price/visibility), roles, profile activation, parent links, enrollments, payments, refunds, coupons, plans, settings.
- Seed data (grades, subjects, 3 terms, settings, 6 sample courses, 2 plans, coupon `WELCOME10`) is inside the migration itself.

## 5. Front-end map (`src/routes`)

Public: `/` (landing), `/catalog`, `/courses/$courseId`, `/auth`, `/reset-password`
Authenticated (`/_authenticated/…`):

| Route | State |
|---|---|
| `dashboard` | redirect to role home |
| `learn`, `learn/$courseId`, `assessments/$assessmentId` | student course player, quizzes, feedback — built |
| `checkout`, `payments` | purchase (calls `simulate_checkout`), receipts, refund request — built, **simulated payments** |
| `family` | parent dashboard, link request, child switching — built |
| `teach`, `teach/$courseId` | instructor course list + editor tabs: Details, Lessons, Assessments, Live classes, Students — built (**uncommitted/staged**) |
| `admin` (overview), `admin/reviews`, `admin/users`, `admin/parents` | built (**admin.* are untracked/uncommitted**) |
| `messages`, `notifications`, `announcements`, `profile` | built |
| `finance` | **“Coming soon” placeholder** |

Nav links that point to routes that do **not exist** (404): `/teach/grading`, `/teach/students`, `/admin/academics`, `/admin/settings`, `/admin/audit`, `/finance/pricing`, `/finance/coupons`, `/finance/transactions`, `/finance/refunds`.

Shared code: `lib/session.ts` (current user + roles), `lib/actions.ts` (toast wrapper, shared queries), `lib/teach.ts`, `lib/student-overview.ts`, `components/ui-kit.tsx`, `admin-kit.tsx`, `app-shell.tsx`.

## 6. Integrations
- Supabase (project id in `supabase/config.toml` and `.env.example`; `.env` is git-ignored and was removed from tracking in commit `e2d6c9a` — **it may still exist in git history**).
- Lovable cloud-auth (Google sign-in) and Lovable error reporting (`lib/lovable-error-reporting.ts`).
- Video: YouTube/Vimeo links are embedded; live classes are just an external meeting URL. No file/video storage buckets exist.
- **No** payment provider, email/SMS sender, video-conferencing API, or file storage.

## 7. Repository state
- Branch `main`, 6 commits. AGENTS.md: project is synced with Lovable — do not rewrite pushed history.
- Large amount of work is **staged but uncommitted** (teach components, profile, announcements) and **untracked** (`admin.parents/reviews/users`). Commit these before further work.
- Verified today: `tsc --noEmit` clean; `vite build` succeeds; `vitest` 1/1 passes; ESLint reports 0 real errors (11 warnings) — the ~11,500 “errors” are all Prettier CRLF line endings (Windows) and need a `.gitattributes`/`endOfLine` setting.
