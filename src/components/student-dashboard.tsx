import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CalendarClock, ExternalLink, MessageSquareText } from "lucide-react";
import { studentOverviewQuery } from "@/lib/student-overview";
import { dateShort, dateTime } from "@/lib/format";
import { EmptyState, Loading, ProgressBar, Section, StatCard, StatusPill, Pill } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { MODE_LABEL } from "@/lib/catalog";

/** Shared by the student home and the parent's per-child view. */
export function StudentDashboard({ studentId, viewer }: { studentId: string; viewer: "student" | "parent" }) {
  const q = useQuery(studentOverviewQuery(studentId));
  if (q.isLoading) return <Loading />;
  if (q.error) return <EmptyState title="Couldn't load learning data" description={q.error.message} />;
  const d = q.data;
  if (!d) return null;

  const now = Date.now();
  const submittedIds = new Set(d.submissions.map((s) => s.assessment_id));
  const courseTitle = (id: string) => d.courses.find((c) => c.courseId === id)?.course?.title ?? "Course";
  const upcoming = d.assessments.filter((a) => !submittedIds.has(a.id) && (!a.due_at || new Date(a.due_at).getTime() >= now));
  const overdue = d.assessments.filter((a) => !submittedIds.has(a.id) && a.due_at && new Date(a.due_at).getTime() < now);
  const sessions = d.sessions.filter((s) => new Date(s.starts_at).getTime() + s.duration_min * 60_000 >= now).slice(0, 5);
  const pastSessions = d.sessions.filter((s) => new Date(s.starts_at).getTime() < now);
  const graded = d.submissions.filter((s) => s.status === "graded");
  const avgAll = graded.length
    ? Math.round(graded.reduce((sum, s) => sum + (Number(s.total_score ?? 0) / Number(s.max_score || 1)) * 100, 0) / graded.length)
    : null;
  const present = d.attendance.filter((a) => a.status !== "absent").length;
  const assessmentTitle = (id: string) => d.assessments.find((a) => a.id === id)?.title ?? "Assessment";

  if (d.courses.length === 0) {
    return (
      <EmptyState
        title={viewer === "student" ? "You're not enrolled in any courses yet" : "No courses yet"}
        description="Browse the catalog to find a course for this grade."
        action={<Button asChild variant="hero"><Link to="/catalog">Browse courses</Link></Button>}
      />
    );
  }

  return (
    <div>
      <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Courses" value={d.courses.length} tone="sun" />
        <StatCard label="Average score" value={avgAll == null ? "—" : `${avgAll}%`} tone="teal" />
        <StatCard label="Due soon" value={upcoming.length} />
        <StatCard
          label="Attendance"
          value={d.attendance.length ? `${Math.round((present / d.attendance.length) * 100)}%` : "—"}
          hint={pastSessions.length ? `${d.attendance.length} of ${pastSessions.length} classes recorded` : "No classes yet"}
          tone={overdue.length ? "coral" : "default"}
        />
      </div>

      {overdue.length > 0 && (
        <div className="pop-card mb-10 flex items-start gap-3 bg-coral-soft p-5">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-coral" />
          <div>
            <p className="font-bold">{overdue.length} overdue {overdue.length === 1 ? "activity" : "activities"}</p>
            <p className="text-sm text-muted-foreground">
              {overdue.map((a) => `${a.title} (${courseTitle(a.course_id)})`).join(" · ")}
            </p>
          </div>
        </div>
      )}

      <Section title="Courses">
        <div className="grid gap-4 md:grid-cols-2">
          {d.courses.map((c) => (
            <div key={c.enrollmentId} className="pop-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-teal">
                    {c.course?.subjects?.name} · {c.course?.grade_levels?.name}
                  </p>
                  <h3 className="mt-1 font-display text-xl font-bold">{c.course?.title}</h3>
                </div>
                {c.course && <Pill tone={c.course.delivery_mode === "guided" ? "sun" : "teal"}>{MODE_LABEL[c.course.delivery_mode]}</Pill>}
              </div>
              <div className="mt-4 flex items-center gap-3">
                <ProgressBar value={c.progress} />
                <span className="w-12 text-right text-sm font-bold">{c.progress}%</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {c.doneLessons} of {c.totalLessons} lessons · Avg score {c.avgScore == null ? "—" : `${c.avgScore}%`}
              </p>
              {viewer === "student" && (
                <Button asChild variant="pop" size="sm" className="mt-4">
                  <Link to="/learn/$courseId" params={{ courseId: c.courseId }}>Continue</Link>
                </Button>
              )}
            </div>
          ))}
        </div>
      </Section>

      <div className="grid gap-8 lg:grid-cols-2">
        <Section title="Upcoming work">
          {upcoming.length === 0 ? (
            <EmptyState title="Nothing due" description="All caught up!" />
          ) : (
            <ul className="grid gap-2">
              {upcoming.slice(0, 6).map((a) => (
                <li key={a.id} className="pop-card-flat flex items-center justify-between gap-3 p-4">
                  <div>
                    <p className="font-semibold">{a.title}</p>
                    <p className="text-xs text-muted-foreground">{courseTitle(a.course_id)} · due {dateShort(a.due_at)}</p>
                  </div>
                  {viewer === "student" ? (
                    <Button asChild size="sm" variant="soft">
                      <Link to="/assessments/$assessmentId" params={{ assessmentId: a.id }}>Start</Link>
                    </Button>
                  ) : (
                    <Pill tone="sun">{a.kind}</Pill>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Live classes">
          {sessions.length === 0 ? (
            <EmptyState title="No live classes scheduled" />
          ) : (
            <ul className="grid gap-2">
              {sessions.map((s) => (
                <li key={s.id} className="pop-card-flat flex items-center justify-between gap-3 p-4">
                  <div className="flex items-start gap-3">
                    <CalendarClock className="mt-0.5 size-5 text-teal" />
                    <div>
                      <p className="font-semibold">{s.title}</p>
                      <p className="text-xs text-muted-foreground">{courseTitle(s.course_id)} · {dateTime(s.starts_at)} · {s.duration_min} min</p>
                    </div>
                  </div>
                  {s.meeting_url && viewer === "student" && (
                    <Button asChild size="sm" variant="teal">
                      <a href={s.meeting_url} target="_blank" rel="noreferrer">Join <ExternalLink /></a>
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      <Section title="Recent results">
        {d.submissions.length === 0 ? (
          <EmptyState title="No results yet" />
        ) : (
          <div className="pop-card-flat overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b-2 border-ink bg-muted text-left">
                <tr>
                  <th className="p-3">Assessment</th>
                  <th className="p-3">Course</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Score</th>
                  <th className="p-3">Teacher feedback</th>
                </tr>
              </thead>
              <tbody>
                {d.submissions.slice(0, 10).map((s) => (
                  <tr key={s.id} className="border-b last:border-0">
                    <td className="p-3 font-semibold">
                      {viewer === "student" ? (
                        <Link to="/assessments/$assessmentId" params={{ assessmentId: s.assessment_id }} className="hover:underline">
                          {assessmentTitle(s.assessment_id)}
                        </Link>
                      ) : (
                        assessmentTitle(s.assessment_id)
                      )}
                    </td>
                    <td className="p-3 text-muted-foreground">{courseTitle(s.course_id)}</td>
                    <td className="p-3"><StatusPill status={s.status} /></td>
                    <td className="p-3 font-bold">
                      {s.total_score == null ? "Awaiting marking" : `${Math.round((Number(s.total_score) / Number(s.max_score || 1)) * 100)}%`}
                      {s.flagged && <span className="ml-2"><Pill tone="coral">needs support</Pill></span>}
                    </td>
                    <td className="max-w-xs p-3 text-muted-foreground">{s.feedback ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {viewer === "parent" && d.interventions.length > 0 && (
        <Section title="Notes from teachers">
          <ul className="grid gap-2">
            {d.interventions.map((i) => (
              <li key={i.id} className="pop-card-flat flex gap-3 p-4">
                <MessageSquareText className="mt-0.5 size-5 text-teal" />
                <div>
                  <p className="font-semibold">{i.concern}</p>
                  <p className="text-sm text-muted-foreground">{i.action}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{courseTitle(i.course_id ?? "")} · {dateShort(i.created_at)}</p>
                </div>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}
