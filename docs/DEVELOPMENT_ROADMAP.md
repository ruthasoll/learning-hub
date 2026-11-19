# Development Roadmap (proposed — awaiting your approval)

Ordered by dependency and risk. No implementation has been started. Each phase ends with tests run and honestly reported.

## Phase 0 — Safety net (before new features)
1. Commit the currently uncommitted work (staged + untracked files) on `main` as a normal commit (no history rewrite; Lovable is synced).
2. Add `.gitattributes`/Prettier `endOfLine` so lint is meaningful; update README with setup and env instructions.
3. **Close Critical security holes** (Technical Debt #1, #2): revoke public execute on `simulate_checkout` (or gate it behind a non-production flag); remove the "first user becomes admin" rule and replace with a manual bootstrap; protect against removing the last admin. These are database migrations — I will write them as new migration files and **will not run them on your live database without your approval**.
4. Set up a test harness: SQL/RLS tests (against a local or throwaway Supabase) for roles, parent privacy, enrollment gating, auto-grading, course-approval rules; plus component tests for role gates.

## Phase 1 — Finish the core learning loop (highest product value)
1. **Manual grading screen** (`/teach/grading`): list ungraded submissions, view answers, assign marks and feedback via `grade_submission` (INS-08, INS-09).
2. **Student support + interventions** (`/teach/students`): use `students_needing_support`, add interventions form and parent-share option (INS-11, INS-12).
3. **Re-approval for edits to published courses** (INS-03/FIX-1), with review history.
4. Enforce deactivation (`is_active`) in the database (FIX-3).

## Phase 2 — Platform admin completion
1. Academic structure UI (grades, subjects, terms) (ADM-03) and instructor assignment (ADM-04).
2. Settings UI, notification rules/templates (ADM-11, ADM-12); make the performance rule configurable and **off by default** (FIX-2).
3. Audit log viewer with filters (ADM-13).
4. Admin reports: enrollment, course activity, learning (ADM-09, ADM-14).

## Phase 3 — Finance (provider-neutral)
1. Pricing, discounts, transactions, refund decisions, finance reports/audit UI (FIN-01–04, 06, 09, 10) on top of the existing tables and RPCs.
2. Payment-provider abstraction: a server-side "payment intent → webhook confirms → enrollment granted" flow with a provider adapter interface, so Stripe/Paystack/Flutterwave/local gateways can be plugged in without changing the data model. Keep `simulated` only as a dev adapter. **No provider chosen or hard-coded until you decide.**
3. Reconciliation and enrollment/payment discrepancy tools (FIN-05, FIN-07) once a provider exists.
4. Parent payment views: downloadable receipts, subscription status (PAR-12).

## Phase 4 — Parent and communication completeness
1. Performance trends and downloadable reports (PAR-05, PAR-11, INS-14 exports).
2. Real notification delivery (email at least) driven by `notify_email` preference; delivery log (PAR-06, PAR-14).
3. Attendance/participation views for guided lessons (PAR-07).
4. Stronger link-verification flow (depends on your decision below).

## Phase 5 — Learning experience by age group
1. Distinct guided-learning (Pre-KG–4) experience: teacher-led session plans, parent-assisted activities, simple UI.
2. Self-paced features for 5–12: file/document upload (Supabase Storage with RLS), progress locking, optional live sessions (link-out vs integrated).
3. Question types/attempts policy, question bank, retakes.

## Phase 6 — Production readiness
Pagination and server-side aggregation (views/RPCs), input validation with zod, accessibility pass, performance, error monitoring, backups, MFA/session policy for admins, privacy policy/consent for children's data, separate dev/staging/prod Supabase projects, demo seed split from migrations.

## Decisions I need from you (I will not guess these)

1. **Payment provider and model** (per course / per term / subscription / bundles) — and the target market/currencies, since that drives provider choice. Until then I will build the provider-neutral flow only.
2. **Definition of "poor performance"** for parent alerts (score threshold? multiple low scores? overdue work? attendance?) and who may configure it. Until then the current 50% rule will be turned off by default.
3. **Parent verification method**: keep email-match plus admin approval, or require a student-side confirmation / code / documents? And what parents may see for older students (e.g. Grade 10–12 privacy).
4. **Enforce delivery mode by grade?** Should Pre-KG–Grade 4 courses be forced to "guided" and Grade 5–12 default to "self-paced", or may admins override per course?
5. **Live classes**: keep an external link (Zoom/Meet/Teams) or build/integrate in-app classrooms?
6. **Assessment policy**: attempts allowed, retakes, whether grades can be changed after release.
7. **Notification channels** for launch: email only, or SMS/WhatsApp too?
8. **Environments**: may I create/use a separate non-production Supabase project for testing migrations? (I will not run destructive operations on the live one without approval.)

## Immediate next step proposed
Phase 0 steps 1–3 (commit, line-endings/README, close the two critical security holes as new migration files for your review). Reply "go" or adjust the order and I will start.
