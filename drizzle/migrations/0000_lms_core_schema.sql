
-- ============ ENUMS ============
create type public.app_role as enum ('platform_admin','finance_admin','instructor','student','parent');
create type public.course_status as enum ('draft','pending','approved','rejected','published');
create type public.delivery_mode as enum ('guided','self_paced');
create type public.payment_status as enum ('pending','succeeded','failed','refunded','disputed');

-- ============ ACADEMIC STRUCTURE ============
create table public.grade_levels (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order int not null,
  default_mode public.delivery_mode not null default 'self_paced',
  created_at timestamptz not null default now()
);
create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);
create table public.academic_periods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  starts_on date,
  ends_on date,
  is_current boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============ USERS ============
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text,
  phone text,
  grade_level_id uuid references public.grade_levels(id) on delete set null,
  requested_role text,
  is_active boolean not null default true,
  notify_in_app boolean not null default true,
  notify_email boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

-- ============ COURSES ============
create table public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text not null default '',
  description text not null default '',
  subject_id uuid references public.subjects(id) on delete set null,
  grade_level_id uuid references public.grade_levels(id) on delete set null,
  period_id uuid references public.academic_periods(id) on delete set null,
  instructor_id uuid references public.profiles(id) on delete set null,
  delivery_mode public.delivery_mode not null default 'self_paced',
  live_sessions_enabled boolean not null default false,
  status public.course_status not null default 'draft',
  review_comment text,
  is_visible boolean not null default true,
  price numeric(10,2) not null default 0,
  currency text not null default 'USD',
  submitted_at timestamptz,
  reviewed_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  module_id uuid not null references public.modules(id) on delete cascade,
  title text not null,
  content text not null default '',
  video_url text,
  document_url text,
  duration_min int,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create table public.assessments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  instructions text not null default '',
  kind text not null default 'quiz' check (kind in ('quiz','assignment','exam')),
  due_at timestamptz,
  pass_mark int not null default 50,
  created_at timestamptz not null default now()
);
create table public.questions (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  kind text not null check (kind in ('mcq','true_false','written')),
  prompt text not null,
  options jsonb not null default '[]'::jsonb,
  marks numeric not null default 1,
  rubric text,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create table public.question_keys (
  question_id uuid primary key references public.questions(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  correct_answer text not null
);

-- ============ FINANCE (plans needed by enrollments/payments) ============
create table public.price_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null default 'bundle' check (kind in ('bundle','term','subscription')),
  description text not null default '',
  amount numeric(10,2) not null default 0,
  currency text not null default 'USD',
  course_ids uuid[] not null default '{}',
  billing_interval text,
  period_id uuid references public.academic_periods(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  description text not null default '',
  percent_off numeric,
  amount_off numeric,
  active boolean not null default true,
  expires_at timestamptz,
  max_redemptions int,
  times_redeemed int not null default 0,
  created_at timestamptz not null default now()
);
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  payer_id uuid references public.profiles(id) on delete set null,
  student_id uuid references public.profiles(id) on delete set null,
  course_id uuid references public.courses(id) on delete set null,
  plan_id uuid references public.price_plans(id) on delete set null,
  subtotal numeric(10,2) not null default 0,
  discount numeric(10,2) not null default 0,
  amount numeric(10,2) not null default 0,
  currency text not null default 'USD',
  coupon_code text,
  provider text not null default 'simulated',
  provider_ref text,
  status public.payment_status not null default 'pending',
  refunded_at timestamptz,
  refund_reason text,
  reconciled_at timestamptz,
  settlement_ref text,
  notes text,
  created_at timestamptz not null default now()
);
create table public.refund_requests (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete cascade,
  requested_by uuid references public.profiles(id) on delete set null default auth.uid(),
  reason text not null default '',
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  decided_by uuid references public.profiles(id) on delete set null,
  decision_note text,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

-- ============ LEARNING ============
create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  status text not null default 'active' check (status in ('active','revoked','refunded')),
  source text not null default 'purchase' check (source in ('purchase','granted')),
  payment_id uuid references public.payments(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (student_id, course_id)
);
create table public.lesson_progress (
  student_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (student_id, lesson_id)
);
create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  status text not null default 'submitted' check (status in ('submitted','graded')),
  auto_score numeric,
  manual_score numeric,
  total_score numeric,
  max_score numeric,
  feedback text,
  graded_by uuid references public.profiles(id) on delete set null,
  graded_at timestamptz,
  flagged boolean not null default false,
  submitted_at timestamptz not null default now(),
  unique (assessment_id, student_id)
);
create table public.answers (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  response text not null default '',
  is_correct boolean,
  marks_awarded numeric,
  feedback text
);
create table public.live_sessions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  starts_at timestamptz not null,
  duration_min int not null default 45,
  meeting_url text,
  notes text,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create table public.attendance (
  session_id uuid not null references public.live_sessions(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  status text not null default 'present' check (status in ('present','absent','late')),
  recorded_at timestamptz not null default now(),
  primary key (session_id, student_id)
);
create table public.interventions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid references public.courses(id) on delete cascade,
  instructor_id uuid references public.profiles(id) on delete set null default auth.uid(),
  concern text not null default '',
  action text not null default '',
  follow_up_on date,
  shared_with_parent boolean not null default false,
  status text not null default 'open' check (status in ('open','resolved')),
  created_at timestamptz not null default now()
);

-- ============ FAMILY & COMMUNICATION ============
create table public.parent_links (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.profiles(id) on delete cascade,
  student_email text not null,
  student_id uuid references public.profiles(id) on delete cascade,
  relationship text not null default 'parent',
  status text not null default 'pending' check (status in ('pending','verified','rejected')),
  note text,
  created_at timestamptz not null default now(),
  verified_at timestamptz
);
create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references public.courses(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  title text not null,
  body text not null default '',
  audience text not null default 'all' check (audience in ('all','students','parents')),
  created_at timestamptz not null default now()
);
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null default '',
  kind text not null default 'info',
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create table public.platform_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  category text not null default 'general',
  action text not null,
  entity text not null,
  entity_id text,
  details jsonb,
  created_at timestamptz not null default now()
);

create index on public.enrollments(course_id);
create index on public.lessons(module_id);
create index on public.questions(assessment_id);
create index on public.submissions(course_id);
create index on public.notifications(user_id, created_at desc);
create index on public.messages(recipient_id, created_at desc);
create index on public.messages(sender_id, created_at desc);
create index on public.payments(created_at desc);
create index on public.audit_log(created_at desc);

-- ============ GRANTS ============
grant select on public.grade_levels, public.subjects, public.academic_periods to anon;
grant select on public.courses, public.modules, public.price_plans to anon;
grant select, insert, update, delete on
  public.grade_levels, public.subjects, public.academic_periods, public.profiles, public.courses,
  public.modules, public.lessons, public.assessments, public.questions, public.question_keys,
  public.price_plans, public.coupons, public.payments, public.refund_requests, public.enrollments,
  public.lesson_progress, public.submissions, public.answers, public.live_sessions, public.attendance,
  public.interventions, public.parent_links, public.announcements, public.messages, public.notifications,
  public.platform_settings
to authenticated;
grant select, insert, delete on public.user_roles to authenticated;
grant select on public.audit_log to authenticated;
grant all on
  public.grade_levels, public.subjects, public.academic_periods, public.profiles, public.user_roles, public.courses,
  public.modules, public.lessons, public.assessments, public.questions, public.question_keys,
  public.price_plans, public.coupons, public.payments, public.refund_requests, public.enrollments,
  public.lesson_progress, public.submissions, public.answers, public.live_sessions, public.attendance,
  public.interventions, public.parent_links, public.announcements, public.messages, public.notifications,
  public.platform_settings, public.audit_log
to service_role;

-- ============ RLS ON ============
alter table public.grade_levels enable row level security;
alter table public.subjects enable row level security;
alter table public.academic_periods enable row level security;
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.courses enable row level security;
alter table public.modules enable row level security;
alter table public.lessons enable row level security;
alter table public.assessments enable row level security;
alter table public.questions enable row level security;
alter table public.question_keys enable row level security;
alter table public.price_plans enable row level security;
alter table public.coupons enable row level security;
alter table public.payments enable row level security;
alter table public.refund_requests enable row level security;
alter table public.enrollments enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.submissions enable row level security;
alter table public.answers enable row level security;
alter table public.live_sessions enable row level security;
alter table public.attendance enable row level security;
alter table public.interventions enable row level security;
alter table public.parent_links enable row level security;
alter table public.announcements enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.platform_settings enable row level security;
alter table public.audit_log enable row level security;

-- ============ HELPER FUNCTIONS ============
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;
create or replace function public.is_platform_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role(auth.uid(), 'platform_admin')
$$;
create or replace function public.is_finance_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role(auth.uid(), 'finance_admin')
$$;
create or replace function public.is_parent_of(_student uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.parent_links
    where parent_id = auth.uid() and student_id = _student and status = 'verified')
$$;
create or replace function public.is_course_owner(_course uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.courses where id = _course and instructor_id = auth.uid())
$$;
create or replace function public.can_edit_course(_course uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_course_owner(_course) or public.is_platform_admin()
$$;
create or replace function public.is_enrolled(_course uuid, _student uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.enrollments
    where course_id = _course and student_id = _student and status = 'active')
$$;
create or replace function public.is_published_course(_course uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.courses where id = _course and status = 'published' and is_visible)
$$;
create or replace function public.can_view_course_content(_course uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.can_edit_course(_course)
    or public.is_enrolled(_course, auth.uid())
    or exists (
      select 1 from public.enrollments e
      join public.parent_links p on p.student_id = e.student_id
      where e.course_id = _course and e.status = 'active'
        and p.parent_id = auth.uid() and p.status = 'verified')
$$;
create or replace function public.can_see_student(_student uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select _student = auth.uid()
    or public.is_platform_admin()
    or public.is_finance_admin()
    or public.is_parent_of(_student)
    or exists (select 1 from public.enrollments e join public.courses c on c.id = e.course_id
               where e.student_id = _student and c.instructor_id = auth.uid())
$$;
create or replace function public.can_see_profile(_target uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.can_see_student(_target)
    or public.has_role(_target, 'instructor')
    or public.has_role(_target, 'platform_admin')
    or exists (select 1 from public.parent_links
               where student_id = auth.uid() and parent_id = _target and status = 'verified')
    or exists (select 1 from public.parent_links p
               join public.enrollments e on e.student_id = p.student_id
               join public.courses c on c.id = e.course_id
               where p.parent_id = _target and p.status = 'verified' and c.instructor_id = auth.uid())
    or exists (select 1 from public.messages m
               where (m.sender_id = auth.uid() and m.recipient_id = _target)
                  or (m.recipient_id = auth.uid() and m.sender_id = _target))
$$;
create or replace function public.can_message(_other uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select _other <> auth.uid() and (
    public.is_platform_admin()
    or public.has_role(_other, 'platform_admin')
    or exists (select 1 from public.enrollments e join public.courses c on c.id = e.course_id
               where e.student_id = _other and c.instructor_id = auth.uid())
    or exists (select 1 from public.enrollments e join public.courses c on c.id = e.course_id
               where c.instructor_id = _other and e.status = 'active'
                 and (e.student_id = auth.uid() or public.is_parent_of(e.student_id)))
    or exists (select 1 from public.parent_links p
               join public.enrollments e on e.student_id = p.student_id
               join public.courses c on c.id = e.course_id
               where p.parent_id = _other and p.status = 'verified' and c.instructor_id = auth.uid())
    or exists (select 1 from public.messages m where m.sender_id = _other and m.recipient_id = auth.uid())
  )
$$;

-- ============ POLICIES ============
-- Academic structure: readable by everyone, managed by platform admins
create policy "read grade levels" on public.grade_levels for select to anon, authenticated using (true);
create policy "admin manage grade levels" on public.grade_levels for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy "read subjects" on public.subjects for select to anon, authenticated using (true);
create policy "admin manage subjects" on public.subjects for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy "read periods" on public.academic_periods for select to anon, authenticated using (true);
create policy "admin manage periods" on public.academic_periods for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());

-- Profiles
create policy "view permitted profiles" on public.profiles for select to authenticated using (public.can_see_profile(id));
create policy "insert own profile" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "update own or admin" on public.profiles for update to authenticated using (id = auth.uid() or public.is_platform_admin()) with check (id = auth.uid() or public.is_platform_admin());

-- Roles
create policy "view own roles or admin" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.is_platform_admin());
create policy "admin grants roles" on public.user_roles for insert to authenticated with check (public.is_platform_admin());
create policy "admin revokes roles" on public.user_roles for delete to authenticated using (public.is_platform_admin());

-- Courses
create policy "public sees published courses" on public.courses for select to anon using (status = 'published' and is_visible);
create policy "users see permitted courses" on public.courses for select to authenticated using (
  (status = 'published' and is_visible) or public.can_view_course_content(id) or public.is_finance_admin());
create policy "instructors create courses" on public.courses for insert to authenticated with check (
  public.has_role(auth.uid(), 'instructor') or public.is_platform_admin());
create policy "owners admins finance update courses" on public.courses for update to authenticated using (
  instructor_id = auth.uid() or public.is_platform_admin() or public.is_finance_admin())
  with check (instructor_id = auth.uid() or public.is_platform_admin() or public.is_finance_admin());
create policy "owners delete drafts, admins delete any" on public.courses for delete to authenticated using (
  public.is_platform_admin() or (instructor_id = auth.uid() and status in ('draft','rejected')));

-- Modules (titles public for published courses = syllabus)
create policy "view modules" on public.modules for select to anon, authenticated using (
  public.is_published_course(course_id) or public.can_view_course_content(course_id));
create policy "edit modules" on public.modules for all to authenticated using (public.can_edit_course(course_id)) with check (public.can_edit_course(course_id));

create policy "view lessons" on public.lessons for select to authenticated using (public.can_view_course_content(course_id));
create policy "edit lessons" on public.lessons for all to authenticated using (public.can_edit_course(course_id)) with check (public.can_edit_course(course_id));

create policy "view assessments" on public.assessments for select to authenticated using (public.can_view_course_content(course_id));
create policy "edit assessments" on public.assessments for all to authenticated using (public.can_edit_course(course_id)) with check (public.can_edit_course(course_id));

create policy "view questions" on public.questions for select to authenticated using (public.can_view_course_content(course_id));
create policy "edit questions" on public.questions for all to authenticated using (public.can_edit_course(course_id)) with check (public.can_edit_course(course_id));

create policy "course editors manage answer keys" on public.question_keys for all to authenticated using (public.can_edit_course(course_id)) with check (public.can_edit_course(course_id));

-- Price plans / coupons
create policy "public sees active plans" on public.price_plans for select to anon using (active);
create policy "users see active plans" on public.price_plans for select to authenticated using (active or public.is_finance_admin() or public.is_platform_admin());
create policy "finance manages plans" on public.price_plans for all to authenticated using (public.is_finance_admin()) with check (public.is_finance_admin());
create policy "finance sees coupons" on public.coupons for select to authenticated using (public.is_finance_admin() or public.is_platform_admin());
create policy "finance manages coupons" on public.coupons for all to authenticated using (public.is_finance_admin()) with check (public.is_finance_admin());

-- Payments
create policy "see own or child payments" on public.payments for select to authenticated using (
  payer_id = auth.uid() or student_id = auth.uid() or public.is_parent_of(student_id)
  or public.is_finance_admin() or public.is_platform_admin());
create policy "finance updates payments" on public.payments for update to authenticated using (public.is_finance_admin()) with check (public.is_finance_admin());

create policy "see own refund requests" on public.refund_requests for select to authenticated using (
  requested_by = auth.uid() or public.is_finance_admin() or public.is_platform_admin());
create policy "payers request refunds" on public.refund_requests for insert to authenticated with check (
  requested_by = auth.uid() and status = 'pending'
  and exists (select 1 from public.payments p where p.id = payment_id and p.payer_id = auth.uid() and p.status = 'succeeded'));

-- Enrollments
create policy "see permitted enrollments" on public.enrollments for select to authenticated using (
  public.can_see_student(student_id) and (student_id = auth.uid() or public.is_parent_of(student_id)
    or public.can_edit_course(course_id) or public.is_platform_admin() or public.is_finance_admin()));
create policy "admins grant enrollments" on public.enrollments for insert to authenticated with check (public.is_platform_admin());
create policy "admins finance update enrollments" on public.enrollments for update to authenticated using (public.is_platform_admin() or public.is_finance_admin()) with check (public.is_platform_admin() or public.is_finance_admin());
create policy "admins delete enrollments" on public.enrollments for delete to authenticated using (public.is_platform_admin());

-- Lesson progress
create policy "see progress" on public.lesson_progress for select to authenticated using (
  student_id = auth.uid() or public.is_parent_of(student_id) or public.can_edit_course(course_id));
create policy "students record progress" on public.lesson_progress for insert to authenticated with check (
  student_id = auth.uid() and public.is_enrolled(course_id, auth.uid()));
create policy "students undo progress" on public.lesson_progress for delete to authenticated using (student_id = auth.uid());

-- Submissions / answers (writes go through functions)
create policy "see submissions" on public.submissions for select to authenticated using (
  student_id = auth.uid() or public.is_parent_of(student_id) or public.can_edit_course(course_id));
create policy "see answers" on public.answers for select to authenticated using (
  exists (select 1 from public.submissions s where s.id = submission_id));

-- Live sessions / attendance
create policy "view sessions" on public.live_sessions for select to authenticated using (public.can_view_course_content(course_id));
create policy "edit sessions" on public.live_sessions for all to authenticated using (public.can_edit_course(course_id)) with check (public.can_edit_course(course_id));
create policy "view attendance" on public.attendance for select to authenticated using (
  student_id = auth.uid() or public.is_parent_of(student_id) or public.can_edit_course(course_id));
create policy "record attendance" on public.attendance for all to authenticated using (public.can_edit_course(course_id)) with check (public.can_edit_course(course_id));

-- Interventions
create policy "view interventions" on public.interventions for select to authenticated using (
  public.is_platform_admin() or instructor_id = auth.uid()
  or (course_id is not null and public.can_edit_course(course_id))
  or (shared_with_parent and public.is_parent_of(student_id)));
create policy "instructors record interventions" on public.interventions for insert to authenticated with check (
  instructor_id = auth.uid() and (public.is_platform_admin() or (course_id is not null and public.can_edit_course(course_id))));
create policy "instructors update interventions" on public.interventions for update to authenticated using (
  instructor_id = auth.uid() or public.is_platform_admin()) with check (instructor_id = auth.uid() or public.is_platform_admin());
create policy "instructors delete interventions" on public.interventions for delete to authenticated using (
  instructor_id = auth.uid() or public.is_platform_admin());

-- Parent links
create policy "view parent links" on public.parent_links for select to authenticated using (
  parent_id = auth.uid() or student_id = auth.uid() or public.is_platform_admin());
create policy "parents request links" on public.parent_links for insert to authenticated with check (
  parent_id = auth.uid() and status = 'pending' and student_id is null and public.has_role(auth.uid(), 'parent'));
create policy "parents cancel pending links" on public.parent_links for delete to authenticated using (
  (parent_id = auth.uid() and status = 'pending') or public.is_platform_admin());
create policy "admins manage parent links" on public.parent_links for update to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());

-- Announcements
create policy "view announcements" on public.announcements for select to authenticated using (
  author_id = auth.uid() or course_id is null or public.can_view_course_content(course_id));
create policy "post announcements" on public.announcements for insert to authenticated with check (
  author_id = auth.uid() and ((course_id is null and public.is_platform_admin()) or (course_id is not null and public.can_edit_course(course_id))));
create policy "delete own announcements" on public.announcements for delete to authenticated using (author_id = auth.uid() or public.is_platform_admin());

-- Messages
create policy "view own messages" on public.messages for select to authenticated using (sender_id = auth.uid() or recipient_id = auth.uid());
create policy "send permitted messages" on public.messages for insert to authenticated with check (sender_id = auth.uid() and public.can_message(recipient_id));
create policy "recipient marks read" on public.messages for update to authenticated using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());

-- Notifications
create policy "view own notifications" on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "update own notifications" on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "delete own notifications" on public.notifications for delete to authenticated using (user_id = auth.uid());

-- Settings
create policy "read settings" on public.platform_settings for select to authenticated using (true);
create policy "admins manage settings" on public.platform_settings for all to authenticated using (
  public.is_platform_admin() or (public.is_finance_admin() and key like 'finance_%'))
  with check (public.is_platform_admin() or (public.is_finance_admin() and key like 'finance_%'));

-- Audit
create policy "admins read audit" on public.audit_log for select to authenticated using (
  public.is_platform_admin() or (public.is_finance_admin() and category = 'financial'));

-- ============ TRIGGERS: profiles & signup ============
create or replace function public.touch_updated_at() returns trigger language plpgsql set search_path = public as $$
begin new.updated_at := now(); return new; end $$;

create or replace function public.protect_profile_fields() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.has_role(auth.uid(), 'platform_admin') then
    new.is_active := old.is_active;
    new.requested_role := old.requested_role;
    new.email := old.email;
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger profiles_protect before update on public.profiles for each row execute function public.protect_profile_fields();

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
declare
  acct text := new.raw_user_meta_data->>'account_type';
  g uuid;
begin
  begin
    g := nullif(new.raw_user_meta_data->>'grade_level_id', '')::uuid;
  exception when others then g := null;
  end;
  insert into public.profiles (id, full_name, email, grade_level_id, requested_role)
  values (new.id,
          coalesce(nullif(new.raw_user_meta_data->>'full_name',''), nullif(new.raw_user_meta_data->>'name',''), split_part(new.email, '@', 1)),
          new.email, g,
          case when acct = 'instructor' then 'instructor' else null end);
  if acct = 'parent' then
    insert into public.user_roles (user_id, role) values (new.id, 'parent');
  elsif acct = 'student' then
    insert into public.user_roles (user_id, role) values (new.id, 'student');
  end if;
  if not exists (select 1 from public.user_roles where role = 'platform_admin') then
    insert into public.user_roles (user_id, role) values (new.id, 'platform_admin');
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- For accounts created through Google: pick an account type once
create or replace function public.choose_account_type(_type text, _grade_level_id uuid default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  if exists (select 1 from public.user_roles where user_id = auth.uid() and role in ('student','parent','instructor'))
     or exists (select 1 from public.profiles where id = auth.uid() and requested_role is not null) then
    raise exception 'Your account type is already set';
  end if;
  if _type = 'student' then
    insert into public.user_roles (user_id, role) values (auth.uid(), 'student');
    update public.profiles set grade_level_id = _grade_level_id where id = auth.uid();
  elsif _type = 'parent' then
    insert into public.user_roles (user_id, role) values (auth.uid(), 'parent');
  elsif _type = 'instructor' then
    update public.profiles set requested_role = 'instructor' where id = auth.uid();
  else
    raise exception 'Unknown account type';
  end if;
end $$;

-- ============ TRIGGERS: course workflow rules ============
create or replace function public.enforce_course_rules() returns trigger language plpgsql security definer set search_path = public as $$
declare
  is_admin boolean;
  is_fin boolean;
  is_owner boolean;
  _price numeric;
  _currency text;
begin
  if auth.uid() is null then
    new.updated_at := now();
    return new;
  end if;
  is_admin := public.has_role(auth.uid(), 'platform_admin');
  is_fin := public.has_role(auth.uid(), 'finance_admin');

  if tg_op = 'INSERT' then
    if not is_admin then
      new.instructor_id := auth.uid();
      new.is_visible := true;
    end if;
    new.status := 'draft';
    new.review_comment := null;
    if not (is_fin or is_admin) then new.price := 0; end if;
    return new;
  end if;

  is_owner := old.instructor_id = auth.uid();

  -- Finance admins (who are not the owner or a platform admin) may only change pricing
  if not is_admin and not is_owner and is_fin then
    _price := new.price; _currency := new.currency;
    new := old;
    new.price := _price; new.currency := _currency; new.updated_at := now();
    return new;
  end if;

  if not is_admin then
    new.instructor_id := old.instructor_id;
    new.review_comment := old.review_comment;
    new.is_visible := old.is_visible;
    new.reviewed_at := old.reviewed_at;
    new.published_at := old.published_at;
    if not is_fin then
      new.price := old.price; new.currency := old.currency;
    end if;
    if new.status is distinct from old.status then
      if not ((old.status in ('draft','rejected') and new.status = 'pending')
              or (old.status = 'pending' and new.status = 'draft')) then
        raise exception 'Only a platform administrator can approve, reject or publish a course';
      end if;
    end if;
  end if;

  if new.status is distinct from old.status then
    if new.status = 'pending' then new.submitted_at := now(); end if;
    if new.status in ('approved','rejected') then new.reviewed_at := now(); end if;
    if new.status = 'published' then
      new.published_at := now();
      if new.reviewed_at is null then new.reviewed_at := now(); end if;
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger courses_rules before insert or update on public.courses for each row execute function public.enforce_course_rules();

-- Notify instructor when a review decision is made
create or replace function public.notify_course_review() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status and new.instructor_id is not null
     and new.status in ('approved','rejected','published') then
    insert into public.notifications (user_id, title, body, kind, link)
    values (new.instructor_id,
            'Course ' || new.status::text || ': ' || new.title,
            coalesce(new.review_comment, ''),
            case when new.status = 'rejected' then 'alert' else 'info' end,
            '/teach/' || new.id);
  end if;
  return new;
end $$;
create trigger courses_review_notify after update on public.courses for each row execute function public.notify_course_review();

-- ============ ASSESSMENT FUNCTIONS ============
create or replace function public.check_performance(_sub uuid) returns void language plpgsql security definer set search_path = public as $$
declare
  s record;
  pct numeric;
  threshold numeric;
  sname text;
begin
  select sub.id, sub.student_id, sub.course_id, sub.total_score, sub.max_score, a.title as atitle
    into s
    from public.submissions sub join public.assessments a on a.id = sub.assessment_id
    where sub.id = _sub;
  if not found or s.max_score is null or s.max_score = 0 or s.total_score is null then return; end if;
  pct := round(s.total_score / s.max_score * 100);
  select (value #>> '{}')::numeric into threshold from public.platform_settings where key = 'low_score_threshold';
  if threshold is null then threshold := 50; end if;
  if pct < threshold then
    update public.submissions set flagged = true where id = _sub;
    select full_name into sname from public.profiles where id = s.student_id;
    insert into public.notifications (user_id, title, body, kind, link)
    select pl.parent_id, 'Learning support alert',
           coalesce(sname, 'Your child') || ' scored ' || pct || '% on "' || s.atitle || '".',
           'alert', '/family'
    from public.parent_links pl join public.profiles pr on pr.id = pl.parent_id
    where pl.student_id = s.student_id and pl.status = 'verified' and pr.notify_in_app;
    insert into public.notifications (user_id, title, body, kind, link)
    select c.instructor_id, 'Student may need support',
           coalesce(sname, 'A student') || ' scored ' || pct || '% on "' || s.atitle || '".',
           'alert', '/teach/students'
    from public.courses c where c.id = s.course_id and c.instructor_id is not null;
  end if;
end $$;
revoke execute on function public.check_performance(uuid) from public, anon, authenticated;

create or replace function public.submit_assessment(_assessment_id uuid, _answers jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  a record;
  q record;
  sub_id uuid;
  resp text;
  k text;
  auto numeric := 0;
  maxs numeric := 0;
  has_written boolean := false;
  correct boolean;
begin
  select * into a from public.assessments where id = _assessment_id;
  if not found then raise exception 'Assessment not found'; end if;
  if not public.is_enrolled(a.course_id, auth.uid()) then
    raise exception 'You are not enrolled in this course';
  end if;
  if exists (select 1 from public.submissions where assessment_id = _assessment_id and student_id = auth.uid()) then
    raise exception 'You have already submitted this assessment';
  end if;
  insert into public.submissions (assessment_id, student_id, course_id, status)
  values (_assessment_id, auth.uid(), a.course_id, 'submitted') returning id into sub_id;

  for q in select * from public.questions where assessment_id = _assessment_id order by position loop
    resp := _answers ->> q.id::text;
    maxs := maxs + q.marks;
    if q.kind = 'written' then
      has_written := true;
      insert into public.answers (submission_id, question_id, response)
      values (sub_id, q.id, coalesce(resp, ''));
    else
      select correct_answer into k from public.question_keys where question_id = q.id;
      correct := k is not null and resp is not null and lower(trim(resp)) = lower(trim(k));
      insert into public.answers (submission_id, question_id, response, is_correct, marks_awarded)
      values (sub_id, q.id, coalesce(resp, ''), correct, case when correct then q.marks else 0 end);
      if correct then auto := auto + q.marks; end if;
    end if;
  end loop;

  update public.submissions set
    auto_score = auto,
    max_score = maxs,
    total_score = case when has_written then null else auto end,
    status = case when has_written then 'submitted' else 'graded' end,
    graded_at = case when has_written then null else now() end
  where id = sub_id;

  if not has_written then perform public.check_performance(sub_id); end if;
  return sub_id;
end $$;

create or replace function public.grade_submission(_submission_id uuid, _grades jsonb, _feedback text)
returns void language plpgsql security definer set search_path = public as $$
declare
  s record;
  g jsonb;
  manual numeric := 0;
begin
  select * into s from public.submissions where id = _submission_id;
  if not found then raise exception 'Submission not found'; end if;
  if not public.can_edit_course(s.course_id) then raise exception 'You cannot grade this course'; end if;
  for g in select value from jsonb_array_elements(coalesce(_grades, '[]'::jsonb)) loop
    update public.answers an set
      marks_awarded = greatest(0, least(coalesce((g->>'marks')::numeric, 0), (select q.marks from public.questions q where q.id = an.question_id))),
      feedback = nullif(g->>'feedback', '')
    where an.id = (g->>'answer_id')::uuid and an.submission_id = _submission_id;
  end loop;
  select coalesce(sum(an.marks_awarded), 0) into manual
    from public.answers an join public.questions q on q.id = an.question_id
    where an.submission_id = _submission_id and q.kind = 'written';
  update public.submissions set
    manual_score = manual,
    total_score = coalesce(auto_score, 0) + manual,
    status = 'graded',
    feedback = nullif(_feedback, ''),
    graded_by = auth.uid(),
    graded_at = now()
  where id = _submission_id;
  insert into public.notifications (user_id, title, body, kind, link)
  select s.student_id, 'Your work was graded', 'Feedback is ready for "' || a.title || '".', 'info', '/assessments/' || a.id
  from public.assessments a where a.id = s.assessment_id;
  perform public.check_performance(_submission_id);
end $$;

-- Students needing support (overdue work or low scores)
create or replace function public.students_needing_support(_course_id uuid default null)
returns table (student_id uuid, student_name text, course_id uuid, course_title text,
               avg_pct numeric, low_count bigint, overdue_count bigint)
language sql stable security definer set search_path = public as $$
  with threshold as (
    select coalesce((select (value #>> '{}')::numeric from public.platform_settings where key = 'low_score_threshold'), 50) as t
  ),
  scope as (
    select e.student_id, e.course_id
    from public.enrollments e
    where e.status = 'active'
      and (_course_id is null or e.course_id = _course_id)
      and (public.can_edit_course(e.course_id) or public.is_parent_of(e.student_id) or e.student_id = auth.uid())
  ),
  scores as (
    select sc.student_id, sc.course_id,
      avg(case when s.max_score > 0 and s.total_score is not null then s.total_score / s.max_score * 100 end) as avg_pct,
      count(*) filter (where s.max_score > 0 and s.total_score is not null and s.total_score / s.max_score * 100 < (select t from threshold)) as low_count
    from scope sc left join public.submissions s on s.student_id = sc.student_id and s.course_id = sc.course_id
    group by sc.student_id, sc.course_id
  ),
  overdue as (
    select sc.student_id, sc.course_id, count(a.id) as overdue_count
    from scope sc join public.assessments a on a.course_id = sc.course_id
    where a.due_at < now()
      and not exists (select 1 from public.submissions s where s.assessment_id = a.id and s.student_id = sc.student_id)
    group by sc.student_id, sc.course_id
  )
  select sc.student_id, p.full_name, sc.course_id, c.title,
         round(coalesce(scores.avg_pct, 0), 1),
         coalesce(scores.low_count, 0), coalesce(overdue.overdue_count, 0)
  from scope sc
  join public.courses c on c.id = sc.course_id
  left join public.profiles p on p.id = sc.student_id
  left join scores on scores.student_id = sc.student_id and scores.course_id = sc.course_id
  left join overdue on overdue.student_id = sc.student_id and overdue.course_id = sc.course_id
  where coalesce(scores.low_count, 0) > 0 or coalesce(overdue.overdue_count, 0) > 0
     or (scores.avg_pct is not null and scores.avg_pct < (select t from threshold))
$$;

-- ============ PAYMENTS (simulated provider) ============
create or replace function public.preview_checkout(_course_id uuid default null, _plan_id uuid default null, _coupon text default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  subtotal numeric := 0; disc numeric := 0; cur text := 'USD'; label text;
  pct numeric; amt numeric; coupon_ok boolean := null;
begin
  if _course_id is not null then
    select price, currency, title into subtotal, cur, label from public.courses where id = _course_id and status = 'published' and is_visible;
    if not found then raise exception 'This course is not available'; end if;
  elsif _plan_id is not null then
    select amount, currency, name into subtotal, cur, label from public.price_plans where id = _plan_id and active;
    if not found then raise exception 'This plan is not available'; end if;
  else
    raise exception 'Nothing selected';
  end if;
  if _coupon is not null and length(trim(_coupon)) > 0 then
    select percent_off, amount_off into pct, amt from public.coupons
      where upper(code) = upper(trim(_coupon)) and active
        and (expires_at is null or expires_at > now())
        and (max_redemptions is null or times_redeemed < max_redemptions);
    if found then
      coupon_ok := true;
      disc := least(subtotal, coalesce(subtotal * pct / 100.0, 0) + coalesce(amt, 0));
    else
      coupon_ok := false;
    end if;
  end if;
  return jsonb_build_object('label', label, 'subtotal', subtotal, 'discount', round(disc, 2),
    'total', round(subtotal - disc, 2), 'currency', cur, 'coupon_valid', coupon_ok);
end $$;

create or replace function public.simulate_checkout(_student_id uuid, _course_id uuid default null, _plan_id uuid default null,
  _coupon text default null, _outcome text default 'succeeded')
returns uuid language plpgsql security definer set search_path = public as $$
declare
  subtotal numeric := 0; disc numeric := 0; cur text := 'USD'; label text;
  course_list uuid[]; cp_id uuid; cp_code text; pct numeric; amt numeric; pay_id uuid;
  ok boolean := coalesce(_outcome, 'succeeded') <> 'failed';
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  if _student_id <> auth.uid() and not public.is_parent_of(_student_id) then
    raise exception 'You can only buy courses for yourself or a verified linked child';
  end if;
  if not public.has_role(_student_id, 'student') then
    raise exception 'Purchases must be made for a student account';
  end if;
  if _course_id is not null then
    select price, currency, title into subtotal, cur, label from public.courses where id = _course_id and status = 'published' and is_visible;
    if not found then raise exception 'This course is not available'; end if;
    course_list := array[_course_id];
  elsif _plan_id is not null then
    select amount, currency, name, course_ids into subtotal, cur, label, course_list from public.price_plans where id = _plan_id and active;
    if not found then raise exception 'This plan is not available'; end if;
  else
    raise exception 'Nothing selected';
  end if;
  if _coupon is not null and length(trim(_coupon)) > 0 then
    select id, code, percent_off, amount_off into cp_id, cp_code, pct, amt from public.coupons
      where upper(code) = upper(trim(_coupon)) and active
        and (expires_at is null or expires_at > now())
        and (max_redemptions is null or times_redeemed < max_redemptions);
    if not found then raise exception 'This coupon code is not valid'; end if;
    disc := least(subtotal, coalesce(subtotal * pct / 100.0, 0) + coalesce(amt, 0));
  end if;

  insert into public.payments (payer_id, student_id, course_id, plan_id, subtotal, discount, amount, currency,
    coupon_code, provider, provider_ref, status)
  values (auth.uid(), _student_id, _course_id, _plan_id, subtotal, round(disc, 2), round(subtotal - disc, 2), cur,
    cp_code, 'simulated', 'SIM-' || upper(substr(md5(random()::text), 1, 10)),
    case when ok then 'succeeded'::public.payment_status else 'failed'::public.payment_status end)
  returning id into pay_id;

  if ok then
    insert into public.enrollments (student_id, course_id, status, source, payment_id)
    select _student_id, cid, 'active', 'purchase', pay_id from unnest(course_list) as cid
    where exists (select 1 from public.courses where id = cid)
    on conflict (student_id, course_id) do update set status = 'active', payment_id = excluded.payment_id;
    if cp_id is not null then update public.coupons set times_redeemed = times_redeemed + 1 where id = cp_id; end if;
    insert into public.notifications (user_id, title, body, kind, link)
    values (auth.uid(), 'Payment received', 'Receipt for "' || label || '" is in Payments.', 'info', '/payments');
  end if;
  return pay_id;
end $$;

create or replace function public.refund_payment(_payment_id uuid, _reason text)
returns void language plpgsql security definer set search_path = public as $$
declare p record; revoke_access boolean;
begin
  if not public.is_finance_admin() then raise exception 'Only finance administrators can refund payments'; end if;
  select * into p from public.payments where id = _payment_id;
  if not found then raise exception 'Payment not found'; end if;
  if p.status <> 'succeeded' and p.status <> 'disputed' then raise exception 'Only successful payments can be refunded'; end if;
  update public.payments set status = 'refunded', refunded_at = now(), refund_reason = _reason where id = _payment_id;
  select coalesce((value #>> '{}')::boolean, true) into revoke_access from public.platform_settings where key = 'finance_revoke_access_on_refund';
  if coalesce(revoke_access, true) then
    update public.enrollments set status = 'refunded' where payment_id = _payment_id;
  end if;
  if p.payer_id is not null then
    insert into public.notifications (user_id, title, body, kind, link)
    values (p.payer_id, 'Refund processed', 'A refund of ' || p.amount || ' ' || p.currency || ' was issued.', 'info', '/payments');
  end if;
end $$;

create or replace function public.decide_refund_request(_request_id uuid, _approve boolean, _note text)
returns void language plpgsql security definer set search_path = public as $$
declare r record;
begin
  if not public.is_finance_admin() then raise exception 'Only finance administrators can decide refunds'; end if;
  select * into r from public.refund_requests where id = _request_id;
  if not found then raise exception 'Request not found'; end if;
  if r.status <> 'pending' then raise exception 'This request was already decided'; end if;
  update public.refund_requests set status = case when _approve then 'approved' else 'rejected' end,
    decided_by = auth.uid(), decision_note = _note, decided_at = now() where id = _request_id;
  if _approve then
    perform public.refund_payment(r.payment_id, coalesce(nullif(_note, ''), r.reason));
  elsif r.requested_by is not null then
    insert into public.notifications (user_id, title, body, kind, link)
    values (r.requested_by, 'Refund request declined', coalesce(_note, ''), 'info', '/payments');
  end if;
end $$;

-- ============ PARENT LINK VERIFICATION ============
create or replace function public.verify_parent_link(_link_id uuid, _approve boolean, _note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare l record; sid uuid;
begin
  if not public.is_platform_admin() then raise exception 'Only platform administrators can verify family links'; end if;
  select * into l from public.parent_links where id = _link_id;
  if not found then raise exception 'Link request not found'; end if;
  if _approve then
    select p.id into sid from public.profiles p
      where lower(p.email) = lower(trim(l.student_email)) and public.has_role(p.id, 'student') limit 1;
    if sid is null then raise exception 'No student account uses that email address'; end if;
    update public.parent_links set status = 'verified', student_id = sid, verified_at = now(), note = _note where id = _link_id;
    insert into public.notifications (user_id, title, body, kind, link)
    values (l.parent_id, 'Child account linked', 'You can now follow your child''s learning.', 'info', '/family');
  else
    update public.parent_links set status = 'rejected', note = _note where id = _link_id;
    insert into public.notifications (user_id, title, body, kind, link)
    values (l.parent_id, 'Link request declined', coalesce(_note, ''), 'info', '/family');
  end if;
end $$;

-- ============ NOTIFICATION FAN-OUT ============
create or replace function public.fanout_announcement() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.course_id is null then
    insert into public.notifications (user_id, title, body, kind, link)
    select distinct ur.user_id, new.title, left(new.body, 240), 'announcement', '/announcements'
    from public.user_roles ur
    where ur.user_id <> new.author_id
      and (new.audience = 'all' or (new.audience = 'students' and ur.role = 'student') or (new.audience = 'parents' and ur.role = 'parent'));
  else
    if new.audience in ('all','students') then
      insert into public.notifications (user_id, title, body, kind, link)
      select distinct e.student_id, new.title, left(new.body, 240), 'announcement', '/announcements'
      from public.enrollments e where e.course_id = new.course_id and e.status = 'active';
    end if;
    if new.audience in ('all','parents') then
      insert into public.notifications (user_id, title, body, kind, link)
      select distinct pl.parent_id, new.title, left(new.body, 240), 'announcement', '/announcements'
      from public.parent_links pl join public.enrollments e on e.student_id = pl.student_id
      where e.course_id = new.course_id and e.status = 'active' and pl.status = 'verified';
    end if;
  end if;
  return new;
end $$;
create trigger announcements_fanout after insert on public.announcements for each row execute function public.fanout_announcement();

create or replace function public.notify_message() returns trigger language plpgsql security definer set search_path = public as $$
declare sname text;
begin
  select full_name into sname from public.profiles where id = new.sender_id;
  insert into public.notifications (user_id, title, body, kind, link)
  values (new.recipient_id, 'New message from ' || coalesce(sname, 'someone'), left(new.body, 160), 'message', '/messages');
  return new;
end $$;
create trigger messages_notify after insert on public.messages for each row execute function public.notify_message();

create or replace function public.notify_live_session() returns trigger language plpgsql security definer set search_path = public as $$
declare ctitle text;
begin
  select title into ctitle from public.courses where id = new.course_id;
  insert into public.notifications (user_id, title, body, kind, link)
  select distinct e.student_id, 'Live class scheduled: ' || new.title,
         coalesce(ctitle, '') || ' — ' || to_char(new.starts_at at time zone 'UTC', 'Mon DD, HH24:MI') || ' UTC', 'session', '/learn/' || new.course_id
  from public.enrollments e where e.course_id = new.course_id and e.status = 'active';
  insert into public.notifications (user_id, title, body, kind, link)
  select distinct pl.parent_id, 'Live class scheduled: ' || new.title,
         coalesce(ctitle, '') || ' — ' || to_char(new.starts_at at time zone 'UTC', 'Mon DD, HH24:MI') || ' UTC', 'session', '/family'
  from public.parent_links pl join public.enrollments e on e.student_id = pl.student_id
  where e.course_id = new.course_id and e.status = 'active' and pl.status = 'verified';
  return new;
end $$;
create trigger live_sessions_notify after insert on public.live_sessions for each row execute function public.notify_live_session();

-- ============ AUDIT ============
create or replace function public.audit_trigger() returns trigger language plpgsql security definer set search_path = public as $$
declare rec jsonb; old_rec jsonb; diff jsonb;
begin
  if tg_op = 'DELETE' then rec := to_jsonb(old); else rec := to_jsonb(new); end if;
  if tg_op = 'UPDATE' then
    old_rec := to_jsonb(old);
    select jsonb_object_agg(e.key, jsonb_build_object('from', old_rec -> e.key, 'to', e.value)) into diff
    from jsonb_each(rec) e where (old_rec -> e.key) is distinct from e.value and e.key not in ('updated_at','description');
  else
    diff := rec - 'description' - 'content';
  end if;
  insert into public.audit_log (actor_id, category, action, entity, entity_id, details)
  values (auth.uid(), coalesce(tg_argv[0], 'general'), lower(tg_op), tg_table_name,
          coalesce(rec ->> 'id', rec ->> 'key', rec ->> 'user_id'), diff);
  return coalesce(new, old);
end $$;

create trigger audit_courses_content after update on public.courses for each row
  when (old.status is distinct from new.status or old.instructor_id is distinct from new.instructor_id
        or old.is_visible is distinct from new.is_visible or old.delivery_mode is distinct from new.delivery_mode)
  execute function public.audit_trigger('content');
create trigger audit_courses_price after update on public.courses for each row
  when (old.price is distinct from new.price or old.currency is distinct from new.currency)
  execute function public.audit_trigger('financial');
create trigger audit_roles after insert or delete on public.user_roles for each row execute function public.audit_trigger('access');
create trigger audit_profiles_active after update on public.profiles for each row
  when (old.is_active is distinct from new.is_active) execute function public.audit_trigger('access');
create trigger audit_parent_links after update on public.parent_links for each row
  when (old.status is distinct from new.status) execute function public.audit_trigger('access');
create trigger audit_enrollments after insert or update or delete on public.enrollments for each row execute function public.audit_trigger('access');
create trigger audit_payments after insert or update on public.payments for each row execute function public.audit_trigger('financial');
create trigger audit_refunds after insert or update on public.refund_requests for each row execute function public.audit_trigger('financial');
create trigger audit_coupons after insert or update or delete on public.coupons for each row execute function public.audit_trigger('financial');
create trigger audit_plans after insert or update or delete on public.price_plans for each row execute function public.audit_trigger('financial');
create trigger audit_settings after insert or update or delete on public.platform_settings for each row execute function public.audit_trigger('config');
revoke execute on function public.audit_trigger() from public, anon, authenticated;

-- ============ SEED DATA ============
insert into public.grade_levels (id, name, sort_order, default_mode) values
  ('10000000-0000-0000-0000-000000000000','Pre-KG',0,'guided'),
  ('10000000-0000-0000-0000-000000000001','KG',1,'guided'),
  ('10000000-0000-0000-0000-000000000002','Grade 1',2,'guided'),
  ('10000000-0000-0000-0000-000000000003','Grade 2',3,'guided'),
  ('10000000-0000-0000-0000-000000000004','Grade 3',4,'guided'),
  ('10000000-0000-0000-0000-000000000005','Grade 4',5,'guided'),
  ('10000000-0000-0000-0000-000000000006','Grade 5',6,'self_paced'),
  ('10000000-0000-0000-0000-000000000007','Grade 6',7,'self_paced'),
  ('10000000-0000-0000-0000-000000000008','Grade 7',8,'self_paced'),
  ('10000000-0000-0000-0000-000000000009','Grade 8',9,'self_paced'),
  ('10000000-0000-0000-0000-000000000010','Grade 9',10,'self_paced'),
  ('10000000-0000-0000-0000-000000000011','Grade 10',11,'self_paced'),
  ('10000000-0000-0000-0000-000000000012','Grade 11',12,'self_paced'),
  ('10000000-0000-0000-0000-000000000013','Grade 12',13,'self_paced');

insert into public.subjects (id, name) values
  ('20000000-0000-0000-0000-000000000001','Mathematics'),
  ('20000000-0000-0000-0000-000000000002','English Language Arts'),
  ('20000000-0000-0000-0000-000000000003','Science'),
  ('20000000-0000-0000-0000-000000000004','Social Studies'),
  ('20000000-0000-0000-0000-000000000005','Art & Music'),
  ('20000000-0000-0000-0000-000000000006','Computer Science');

insert into public.academic_periods (id, name, starts_on, ends_on, is_current) values
  ('30000000-0000-0000-0000-000000000001','2026–27 Term 1','2026-09-01','2026-12-18',true),
  ('30000000-0000-0000-0000-000000000002','2026–27 Term 2','2027-01-11','2027-04-02',false),
  ('30000000-0000-0000-0000-000000000003','2026–27 Term 3','2027-04-19','2027-06-30',false);

insert into public.platform_settings (key, value) values
  ('platform_name', '"Brightpath Academy"'),
  ('low_score_threshold', '50'),
  ('overdue_alerts_enabled', 'true'),
  ('low_score_template', '"{student} scored {score}% on {assessment}. Their teacher may reach out with next steps."'),
  ('support_email', '"support@brightpath.example"'),
  ('session_timeout_minutes', '60'),
  ('finance_revoke_access_on_refund', 'true'),
  ('finance_allow_free_enrollment', 'true'),
  ('finance_currency', '"USD"');

insert into public.courses (id, title, summary, description, subject_id, grade_level_id, period_id, delivery_mode, live_sessions_enabled, status, price, published_at, reviewed_at, submitted_at) values
  ('40000000-0000-0000-0000-000000000001','Counting & Shapes','Playful numbers 1–20 and everyday shapes with a teacher by your side.','Short, teacher-guided sessions where little learners count, sort and spot shapes around the house. Families get simple at-home activities after every class.','20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000000','30000000-0000-0000-0000-000000000001','guided',true,'published',39,now(),now(),now()),
  ('40000000-0000-0000-0000-000000000002','Phonics Adventures','Letter sounds, blending and first words through songs and stories.','A guided phonics journey for KG and Grade 1 learners with weekly live circle time and printable practice sheets.','20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','guided',true,'published',45,now(),now(),now()),
  ('40000000-0000-0000-0000-000000000003','Fractions Foundations','Understand, compare and add fractions at your own pace.','Self-paced lessons with visual models, quick checks after every lesson and an optional weekly help session.','20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000006','30000000-0000-0000-0000-000000000001','self_paced',true,'published',59,now(),now(),now()),
  ('40000000-0000-0000-0000-000000000004','Algebra I','Expressions, linear equations and graphs for Grade 9.','A complete self-paced Algebra I course with auto-graded quizzes and teacher-marked problem sets.','20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000010','30000000-0000-0000-0000-000000000001','self_paced',true,'published',89,now(),now(),now()),
  ('40000000-0000-0000-0000-000000000005','Biology Essentials','Cells, genetics and ecosystems explained clearly.','Self-paced Grade 10 biology with video lessons, lab write-ups and unit tests.','20000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000011','30000000-0000-0000-0000-000000000001','self_paced',false,'published',79,now(),now(),now()),
  ('40000000-0000-0000-0000-000000000006','Creative Writing Studio','Find your voice through stories, poems and personal essays.','Grade 7 writing workshop. Short lessons, written assignments marked by your teacher with personal feedback.','20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000008','30000000-0000-0000-0000-000000000001','self_paced',true,'published',0,now(),now(),now());

insert into public.modules (id, course_id, title, position) values
  ('50000000-0000-0000-0000-000000000011','40000000-0000-0000-0000-000000000001','Numbers 1 to 10',1),
  ('50000000-0000-0000-0000-000000000012','40000000-0000-0000-0000-000000000001','Shapes all around',2),
  ('50000000-0000-0000-0000-000000000021','40000000-0000-0000-0000-000000000002','Letter sounds',1),
  ('50000000-0000-0000-0000-000000000022','40000000-0000-0000-0000-000000000002','Blending words',2),
  ('50000000-0000-0000-0000-000000000031','40000000-0000-0000-0000-000000000003','What is a fraction?',1),
  ('50000000-0000-0000-0000-000000000032','40000000-0000-0000-0000-000000000003','Comparing & adding',2),
  ('50000000-0000-0000-0000-000000000041','40000000-0000-0000-0000-000000000004','Expressions',1),
  ('50000000-0000-0000-0000-000000000042','40000000-0000-0000-0000-000000000004','Linear equations',2),
  ('50000000-0000-0000-0000-000000000051','40000000-0000-0000-0000-000000000005','The cell',1),
  ('50000000-0000-0000-0000-000000000052','40000000-0000-0000-0000-000000000005','Genetics',2),
  ('50000000-0000-0000-0000-000000000061','40000000-0000-0000-0000-000000000006','Story starters',1),
  ('50000000-0000-0000-0000-000000000062','40000000-0000-0000-0000-000000000006','Poetry',2);

insert into public.lessons (course_id, module_id, title, content, video_url, duration_min, position) values
  ('40000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000011','Counting with fingers','Hold up one finger at a time and count out loud together: one, two, three… Then count toys on the table.','https://www.youtube.com/embed/DR-cfDsHCGA',10,1),
  ('40000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000011','Counting objects','Line up 5 spoons. Touch each one as you count. Now try with 10 blocks!',null,10,2),
  ('40000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000012','Circles and squares','A circle is round like a plate. A square has 4 equal sides like a cracker. Go on a shape hunt!',null,12,1),
  ('40000000-0000-0000-0000-000000000002','50000000-0000-0000-0000-000000000021','The sounds of A, M, S','Say each sound slowly: /a/ like apple, /m/ like moon, /s/ like snake.',null,12,1),
  ('40000000-0000-0000-0000-000000000002','50000000-0000-0000-0000-000000000022','Blending CVC words','Put sounds together: /s/ /a/ /t/ → sat. Try mat, sam and am.',null,15,1),
  ('40000000-0000-0000-0000-000000000003','50000000-0000-0000-0000-000000000031','Parts of a whole','A fraction names part of a whole. In 3/4, the 4 tells how many equal parts and the 3 tells how many we have.','https://www.youtube.com/embed/n0FZhQ_GkKw',15,1),
  ('40000000-0000-0000-0000-000000000003','50000000-0000-0000-0000-000000000031','Fractions on a number line','Split the space between 0 and 1 into equal parts. Each mark is one fraction.',null,15,2),
  ('40000000-0000-0000-0000-000000000003','50000000-0000-0000-0000-000000000032','Adding like fractions','When denominators match, add the numerators: 1/5 + 2/5 = 3/5.',null,20,1),
  ('40000000-0000-0000-0000-000000000004','50000000-0000-0000-0000-000000000041','Variables and terms','A variable is a letter that stands for a number. In 3x + 2, 3x and 2 are terms.',null,20,1),
  ('40000000-0000-0000-0000-000000000004','50000000-0000-0000-0000-000000000042','Solving one-step equations','Do the same thing to both sides. x + 4 = 9 → x = 5.',null,20,1),
  ('40000000-0000-0000-0000-000000000005','50000000-0000-0000-0000-000000000051','Inside a cell','Cells have a membrane, cytoplasm and (in eukaryotes) a nucleus that stores DNA.',null,25,1),
  ('40000000-0000-0000-0000-000000000005','50000000-0000-0000-0000-000000000052','DNA and genes','Genes are sections of DNA that carry instructions for traits.',null,25,1),
  ('40000000-0000-0000-0000-000000000006','50000000-0000-0000-0000-000000000061','Hooking your reader','Start in the middle of the action, with a question, or with a surprising detail.',null,15,1),
  ('40000000-0000-0000-0000-000000000006','50000000-0000-0000-0000-000000000062','Imagery in poems','Use the five senses to paint a picture with words.',null,15,1);

insert into public.assessments (id, course_id, title, instructions, kind, due_at, pass_mark) values
  ('60000000-0000-0000-0000-000000000003','40000000-0000-0000-0000-000000000003','Fractions quick check','Answer all questions. Multiple choice is marked instantly.','quiz', now() + interval '14 days', 60),
  ('60000000-0000-0000-0000-000000000004','40000000-0000-0000-0000-000000000004','Equations unit quiz','Solve each equation. The last question is marked by your teacher.','quiz', now() + interval '21 days', 60),
  ('60000000-0000-0000-0000-000000000006','40000000-0000-0000-0000-000000000006','Write a story opening','Write the first paragraph of a story using one of the hooks from the lesson.','assignment', now() + interval '10 days', 50);

insert into public.questions (id, assessment_id, course_id, kind, prompt, options, marks, rubric, position) values
  ('70000000-0000-0000-0000-000000000031','60000000-0000-0000-0000-000000000003','40000000-0000-0000-0000-000000000003','mcq','Which fraction is the same as one half?','["1/3","2/4","3/5","1/4"]',1,null,1),
  ('70000000-0000-0000-0000-000000000032','60000000-0000-0000-0000-000000000003','40000000-0000-0000-0000-000000000003','mcq','What is 1/5 + 2/5?','["3/10","3/5","2/5","1/5"]',1,null,2),
  ('70000000-0000-0000-0000-000000000033','60000000-0000-0000-0000-000000000003','40000000-0000-0000-0000-000000000003','true_false','3/4 is greater than 2/3.','["True","False"]',1,null,3),
  ('70000000-0000-0000-0000-000000000041','60000000-0000-0000-0000-000000000004','40000000-0000-0000-0000-000000000004','mcq','Solve: x + 4 = 9','["x = 13","x = 5","x = 4","x = 36"]',2,null,1),
  ('70000000-0000-0000-0000-000000000042','60000000-0000-0000-0000-000000000004','40000000-0000-0000-0000-000000000004','true_false','In 3x + 2, the coefficient of x is 3.','["True","False"]',1,null,2),
  ('70000000-0000-0000-0000-000000000043','60000000-0000-0000-0000-000000000004','40000000-0000-0000-0000-000000000004','written','Explain, step by step, how to solve 2x − 6 = 10.',  '[]',3,'1 mark for adding 6 to both sides, 1 for dividing by 2, 1 for x = 8.',3),
  ('70000000-0000-0000-0000-000000000061','60000000-0000-0000-0000-000000000006','40000000-0000-0000-0000-000000000006','written','Write your story opening (one paragraph).','[]',10,'Hook (4), vivid detail (3), grammar & clarity (3).',1);

insert into public.question_keys (question_id, course_id, correct_answer) values
  ('70000000-0000-0000-0000-000000000031','40000000-0000-0000-0000-000000000003','2/4'),
  ('70000000-0000-0000-0000-000000000032','40000000-0000-0000-0000-000000000003','3/5'),
  ('70000000-0000-0000-0000-000000000033','40000000-0000-0000-0000-000000000003','True'),
  ('70000000-0000-0000-0000-000000000041','40000000-0000-0000-0000-000000000004','x = 5'),
  ('70000000-0000-0000-0000-000000000042','40000000-0000-0000-0000-000000000004','True');

insert into public.price_plans (name, kind, description, amount, course_ids, billing_interval, period_id) values
  ('Grade 9–10 STEM Bundle','bundle','Algebra I and Biology Essentials together.',149,
   array['40000000-0000-0000-0000-000000000004','40000000-0000-0000-0000-000000000005']::uuid[], null, null),
  ('Early Years Term Pass','term','Counting & Shapes plus Phonics Adventures for Term 1.',69,
   array['40000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000002']::uuid[], null, '30000000-0000-0000-0000-000000000001');

insert into public.coupons (code, description, percent_off, active) values
  ('WELCOME10','10% off your first course',10,true);
