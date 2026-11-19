# Requirements Traceability (SRS: `docs/requirements.md`)

Audit date: 2026-11-19.

## How to read the status column

I have **not** run the app against the live Supabase database or clicked through any flow, and the repo has only one trivial test. So nothing can honestly be called "verified" yet. Statuses are based on reading the SQL, RLS policies and React code:

- **BUILT\*** = code exists end-to-end (UI + database rule) and looks right on reading, but it is **not runtime-verified** (this is the highest status I can give today).
- **PARTIAL** = some of the requirement exists; the gap is stated.
- **MISSING** = no implementation found (database only, or nothing at all).
- **FIX** = implemented but needs correction (reason given).
- **UNVERIFIABLE** = depends on something outside the repo (live DB state, Supabase settings, provider).

## Summary

| Status | Count (of 53 SRS items) |
|---|---|
| BUILT\* (code-read, not runtime-tested) | 20 |
| PARTIAL | 14 |
| MISSING | 18 |
| FIX (implemented but wrong) | 1 (PAR-06) |
| Verified at runtime | 0 |

Plus five cross-cutting FIX items at the end of this file (some affect rows marked BUILT\*). Platform-dependent items such as email confirmation rules are noted inline as unverifiable from the repo.

## Instructor (INS)

| ID | Requirement | Where | Status | Gap / next step |
|---|---|---|---|---|
| INS-01 | View assigned courses/subjects/grades | `teach.index`, `courses.instructor_id` | BUILT\* | Only a single `instructor_id` per course; no teaching-assignment table for multi-instructor/co-teaching. |
| INS-02 | Create courses, modules, lessons, videos, documents, activities | `teach.$courseId` Details/Lessons tabs, `course-content.tsx` | PARTIAL | Lessons are text + YouTube/Vimeo link only. **No document/file upload** (no storage bucket) and no "learning activities" type. |
| INS-03 | Submit for approval | `enforce_course_rules`, course details | BUILT\* | Updates to already-published courses: unclear whether edits re-enter review (instructor can edit lessons of a published course directly via RLS `can_edit_course`) → see FIX-1. |
| INS-04 | Track approval status | `teach.index`, status pill | BUILT\* | |
| INS-05 | Edit returned content, resubmit | trigger allows rejected→pending; `review_comment` shown | BUILT\* | No review history (only latest comment). |
| INS-06 | Create assessments (MCQ, T/F, written, marks, keys, criteria) | `course-assessments.tsx`, `questions.rubric`, `question_keys` | BUILT\* | Only one attempt allowed; no question bank, no short-answer auto-grade, no time limit. |
| INS-07 | Auto-grade objective questions | `submit_assessment` | BUILT\* | Exact (case-insensitive) string match only. Needs automated tests. |
| INS-08 | Manual grading of written work | `grade_submission` RPC exists | **MISSING (UI)** | **No screen calls `grade_submission`.** Nav item `/teach/grading` is a 404. Written work can currently never be graded through the app. Highest-priority gap. |
| INS-09 | Review results, submissions, completion | `course-roster.tsx` (Students tab) | PARTIAL | Shows scores/completion per student; cannot open an individual submission or answers; no export. |
| INS-10 | Manage live sessions | `course-live.tsx` | PARTIAL | Schedule + attendance exist. Only an external meeting URL; no edit of past sessions verified; no recurring sessions; guided (Pre-KG–4) lessons use the same model. |
| INS-11 | Monitor learning (overdue, low scores) | `students_needing_support` RPC, roster flags | PARTIAL | RPC is **never called**; `/teach/students` is a 404. Roster shows flagged submissions only. |
| INS-12 | Record interventions | `interventions` table + RLS; parent view in `student-dashboard.tsx` | **MISSING (UI)** | No instructor form to create/update interventions. |
| INS-13 | Announcements / messages to students and parents | `announcements.tsx`, `messages.tsx` | BUILT\* | Fan-out is in-app only. |
| INS-14 | Reports and export | — | MISSING | No reports, no CSV/PDF export. |

## Platform administrator (ADM)

| ID | Requirement | Where | Status | Gap / next step |
|---|---|---|---|---|
| ADM-01 | Manage users (create, update, deactivate) | `admin.users.tsx`, `profiles.is_active` | PARTIAL | Can view/activate/deactivate; cannot create users or edit details. **`is_active` is enforced only by a client-side check in `app-shell.tsx`**, not by the database or auth, so a deactivated user can still call the API directly → see FIX-3. |
| ADM-02 | Manage roles | `admin.users.tsx`, `user_roles` policies | BUILT\* | Instructor request approval lives here. Needs guard against removing the last admin. |
| ADM-03 | Academic structure | tables + seed only | MISSING (UI) | `/admin/academics` is a 404. RLS already allows admin CRUD. |
| ADM-04 | Assign instructors to courses/grades | `instructor_id` on course | MISSING | Admins can reassign via course RLS but there is no UI; no grade-level/subject eligibility rules. |
| ADM-05 | Review submitted courses | `admin.reviews.tsx` | BUILT\* | |
| ADM-06 | Approve/reject with comments | `admin.reviews.tsx`, trigger | BUILT\* | |
| ADM-07 | Publish; manage visibility | `admin.reviews.tsx`, `is_visible` | BUILT\* | |
| ADM-08 | Configure delivery mode + live settings | `courses.delivery_mode`, `live_sessions_enabled`, `course-details.tsx` | PARTIAL | Default mode by grade exists; no rule enforcing guided for Pre-KG–Grade 4 (instructor can choose). Needs your decision (see roadmap). |
| ADM-09 | Monitor performance/completion | — | MISSING | No admin learning reports. |
| ADM-10 | Manage parent links | `admin.parents.tsx`, `verify_parent_link` | BUILT\* | Verification = email match + admin approval; **no stronger identity check** (see open questions). |
| ADM-11 | Configure notification rules/templates | `platform_settings` keys only | MISSING (UI) | Template key exists but is never used by `check_performance` (message text is hard-coded). |
| ADM-12 | Platform settings | `platform_settings` | MISSING (UI) | `/admin/settings` is a 404. |
| ADM-13 | Audit activity | `audit_log` + triggers | PARTIAL | Logging is good; **no viewer** (`/admin/audit` 404). Instructor lesson/assessment edits are not audited. |
| ADM-14 | Operational reports | — | MISSING | Overview shows 4 counts only. |

## Finance / payment administrator (FIN)

The whole finance area is a "Coming soon" placeholder. Database functions (`refund_payment`, `decide_refund_request`, plan/coupon RLS, audit triggers) exist but have **no UI**.

| ID | Requirement | Status | Notes |
|---|---|---|---|
| FIN-01 | Manage pricing | MISSING (UI) | `price_plans` + `courses.price` + RLS exist. |
| FIN-02 | Discounts/coupons | MISSING (UI) | `coupons` table; coupon validation inside checkout works in SQL. |
| FIN-03 | View/search transactions | MISSING | |
| FIN-04 | Monitor payment status | MISSING | Enum has pending/succeeded/failed/refunded/disputed. |
| FIN-05 | Reconcile | MISSING | `reconciled_at`, `settlement_ref` columns only. Needs a provider. |
| FIN-06 | Refunds | MISSING (UI) | Parents can request (`payments.tsx`); nobody can decide. |
| FIN-07 | Review enrollment/payment discrepancies | MISSING | |
| FIN-08 | Financial access rules | PARTIAL | Two settings (`finance_revoke_access_on_refund`, `finance_allow_free_enrollment`) exist in DB; the second is **not used anywhere**. |
| FIN-09 | Financial reports | MISSING | |
| FIN-10 | Audit financial actions | BUILT\* | Triggers on payments, refunds, coupons, plans, price changes. Viewer missing. |

## Parent (PAR)

| ID | Requirement | Where | Status | Gap / next step |
|---|---|---|---|---|
| PAR-01 | Register, login, manage profile | `auth.tsx`, `profile.tsx` | BUILT\* | Email confirmation/password policy depends on Supabase settings (UNVERIFIABLE from repo). |
| PAR-02 | Request link to child, with verification | `family.tsx`, `verify_parent_link` | PARTIAL | Request by student email, admin approves. Weak verification; any parent can request any student's email (admin must catch it). |
| PAR-03 | Multiple children, switch | `family.tsx`, `myChildrenQuery` | BUILT\* | |
| PAR-04 | Learning dashboard | `student-dashboard.tsx` (shared) | BUILT\* | |
| PAR-05 | Scores, completion, feedback, trends | `student-dashboard.tsx` | PARTIAL | Current scores/feedback shown; no trend over time. |
| PAR-06 | Performance alerts | `check_performance` | **FIX** | Works in-app only and uses a **made-up 50% threshold** — you told us this definition is not final (see FIX-2). No email/SMS delivery. |
| PAR-07 | Attendance and participation | `attendance` table, parent view | PARTIAL | Attendance shown where rendered; no participation/activity metrics; no attendance for guided lessons distinct from live sessions. |
| PAR-08 | Assignments and deadlines | `student-dashboard.tsx` | PARTIAL | Needs runtime check of overdue logic. |
| PAR-09 | Live-class schedules | `student-dashboard.tsx` + `live_sessions` RLS | BUILT\* | |
| PAR-10 | Message instructors | `messages.tsx`, `can_message` | BUILT\* | |
| PAR-11 | View/download reports | — | MISSING | |
| PAR-12 | Payments, receipts, subscriptions, refunds | `payments.tsx` | PARTIAL | Lists payments and refund request. No downloadable receipt; no subscription status/management. |
| PAR-13 | Announcements | `announcements.tsx`, fan-out trigger | BUILT\* | |
| PAR-14 | Notification preferences / channels | `profile.notify_in_app`, `notify_email` columns | PARTIAL | Toggles stored; **email is never sent** (no sender exists). |
| PAR-15 | Privacy: only linked, verified children | RLS (`is_parent_of`, `can_see_student`) | BUILT\* | Design is sound. Needs automated RLS tests. Unverified: parents seeing messages/profiles beyond intent. |

## Cross-cutting requirements from the project brief

| Item | Status | Notes |
|---|---|---|
| Pre-KG–Grade 4 guided; Grade 5–12 self-paced (+optional live) | PARTIAL | `grade_levels.default_mode` + course `delivery_mode`. Learner view shows a guided banner. Not enforced; no distinct guided UX (teacher-led lesson plan, parent-assisted flow). |
| Instructors create, admins approve/publish | BUILT\* | Enforced in DB trigger. Gap: edits after publishing (FIX-1). |
| Auto-grade objective / manual-grade written | PARTIAL | Auto = built; manual = no UI (INS-08). |
| Role separation Platform vs Finance | BUILT\* | Separate roles/policies. Finance can read all student data via `can_see_student` — likely broader than needed (FIX-4). |
| Parent alerts when child performs poorly | FIX | Rule invented (FIX-2). |
| Payments flexible, provider undecided | PARTIAL | Good: `provider` column, plans/coupons/terms. **But checkout is fully simulated and exploitable** (FIX-5, Technical Debt #1). |
| Academic terms | PARTIAL | `academic_periods` on courses/plans; no admin UI, no automatic access expiry by term. |
| Tests | MISSING | 1 trivial test. |
| Documentation | PARTIAL | README is the Lovable boilerplate; these docs added. |

## FIX items (implemented but wrong or unsafe)

- **FIX-1** Instructors can edit lessons/assessments of a *published* course with no re-approval (RLS `can_edit_course` is not status-aware). Violates "administrators must approve" for updates (INS-03).
- **FIX-2** `check_performance` hard-codes a 50% threshold (`platform_settings.low_score_threshold`) and its own message text and alerts parents automatically. You said the definition of poor performance is not final. Make it admin-configurable and off by default until you decide.
- **FIX-3** `profiles.is_active` is enforced only in the browser UI (`app-shell.tsx`); RLS/auth ignore it (ADM-01).
- **FIX-4** `finance_admin` is included in `can_see_student`, giving finance access to student profiles/submissions beyond payment needs.
- **FIX-5** `simulate_checkout` is callable by any signed-in user and grants a paid enrollment without any payment (see Technical Debt #1).
