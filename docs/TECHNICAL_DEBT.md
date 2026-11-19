# Technical Debt, Bugs and Security Findings (2026-11-19)

Severity: **Critical** = must fix before any real user/payment; **High**; **Medium**; **Low**.
Everything below comes from reading the code and SQL. Items marked *(to confirm)* need a runtime check against the real database.

## Critical

1. **Free paid enrollment via `simulate_checkout`.** The SQL function is `security definer`, has default `EXECUTE` for all signed-in users, and accepts `_outcome = 'succeeded'`. Anyone can open the browser console, call `supabase.rpc('simulate_checkout', …)` for a published course and receive an active enrollment with no payment. The checkout screen (`checkout.tsx`) calls it directly. *Fix:* revoke execute on it now (or keep it only behind a "demo mode" setting for non-production), and move real payment confirmation to a server-side webhook that writes `payments`/`enrollments` with the service role. Provider-neutral design: see roadmap.
2. **First user becomes platform admin.** `handle_new_user` makes a new user `platform_admin` whenever *no* admin exists. If the admin is ever deleted/deactivated, or on a fresh database, the next stranger who signs up gets full control. *Fix:* remove this; bootstrap the first admin manually (SQL/seed), and block removing the last admin.
3. **No server-side layer, so every rule must be perfect in RLS/SQL.** All 28 tables rely on RLS and `security definer` functions with no tests. A single mistake leaks child data. *Fix:* write automated database/RLS tests (see roadmap phase 0) before adding features.
4. **Parent privacy rests on weak link verification.** A parent requests a link by typing a student's email; the admin approves. There is no proof the parent is the guardian. Business decision needed (see Roadmap "Decisions").

## High

5. **Manual grading cannot be done in the UI.** `grade_submission` exists but no page calls it; nav links to `/teach/grading` 404. Written work stays ungraded forever.
6. **Finance area is a placeholder**; refund requests from parents can never be decided (`decide_refund_request`, `refund_payment` unused).
7. **Published courses can be edited without re-approval** (RLS `can_edit_course` ignores status). Contradicts the approval requirement.
8. **Deactivation is cosmetic.** `is_active` is only checked in `app-shell.tsx` (browser). The API and RLS still work for deactivated users. Needs RLS helper checks and/or revoking the auth session (a server function using the service role).
9. **Invented business rule: poor performance = under 50% on one assessment**, auto-notifying parents (`check_performance`, `students_needing_support`, seed setting `low_score_threshold`). You said this is not final. Make it admin-configurable, default **off**, and wait for your definition. The stored `low_score_template` is not even used.
10. **Dead/placeholder navigation:** `/teach/grading`, `/teach/students`, `/admin/academics`, `/admin/settings`, `/admin/audit`, `/finance/*` are linked but have no routes (404).
11. **Email notifications are not sent.** Preferences exist (`notify_email`) but there is no sender. Parent alerts are in-app only; a parent who never logs in never learns of a problem.
12. **Finance role can read student profiles/submissions** (`can_see_student` includes `finance_admin`). Over-broad; restrict to payment-relevant data.
13. **No file storage.** SRS wants documents; there is no bucket or upload path, and no storage RLS to design yet.
14. **Seed/sample data lives inside the migration** (sample courses, coupon `WELCOME10`, placeholder support email `support@brightpath.example`, brand "Brightpath Academy"). It would be applied to production. Split into a separate seed script; remove demo coupon.

## Medium

15. **Almost no tests**: 1 routing test. No tests for auto-grading, enrollment gating, RLS, role gates, refunds.
16. **Auto-grading is exact string match** (case-insensitive trimmed). Fine for MCQ/true-false, brittle if option text is edited after students answer.
17. **One attempt only per assessment**, and answer keys are not versioned; editing questions after submissions exist can corrupt past scores. Policy decision needed.
18. **Aggregation done in the browser**: roster/dashboards fetch rows and compute averages client-side — will not scale and risks hitting row limits (Supabase default 1000 rows).
19. **Weak input validation**: zod is installed but screens mostly use ad hoc `useState` and trust the DB. Limits exist for some fields (messages are `slice(0, 4000)`); most text columns are unbounded.
20. **`window.confirm` for destructive actions** (e.g. deleting an assessment, cascading to submissions). Use a proper dialog, and prefer soft-delete for anything holding student results.
21. **Audit log gaps**: lesson/assessment/question changes, grade changes (`grade_submission` edits) and message access are not audited; ADM-13 has no viewer.
22. **Currency and tax**: everything is `USD` numeric; no tax, multi-currency, invoices, or subscription lifecycle (billing_interval is only a label).
23. **Timezone**: notifications format times as UTC text in SQL.
24. **Platform admin role is very powerful** (`can_edit_course` and settings). No MFA/session policy; `session_timeout_minutes` setting exists but is unused.

## Low / housekeeping

25. **Uncommitted work**: many staged and untracked files (teach/admin/profile/announcements). Commit soon; branch syncs to Lovable.
26. **Line endings**: ~11,500 ESLint "errors" are all Prettier CRLF complaints. Add `.gitattributes` (`* text=auto eol=lf`) / `endOfLine` config. Real lint result: 0 errors, 11 warnings.
27. **Two lockfiles** (`bun.lock`, `package-lock.json`); pick one.
28. **README is Lovable boilerplate**; no setup, env, or migration instructions (add).
29. **`.env` was committed once** (commit `b258299`) then untracked. It only held the Supabase URL/project id/publishable key (no service-role key was found). Those are public by design, but rotate if there is any doubt; keep it out of git (already ignored).
30. **`drizzle/schema.ts` is empty** and `types.ts` is generated by Lovable; migrations are the real source of truth. Decide whether to keep drizzle-kit or use Supabase CLI migrations.
31. **Unused dependencies/settings**: recharts, react-hook-form/zod barely used; settings `overdue_alerts_enabled`, `finance_allow_free_enrollment` unused.
32. **Accessibility/responsive design not audited** (not yet checked on a device or with a screen reader).
