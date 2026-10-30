import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, CheckCircle2, Circle, ExternalLink, FileText, Megaphone, MessageSquare, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe, unwrap } from "@/lib/session";
import { act, embedUrl, scorePct } from "@/lib/actions";
import { dateShort, dateTime } from "@/lib/format";
import { MODE_LABEL } from "@/lib/catalog";
import { EmptyState, Loading, PageHeader, Pill, ProgressBar, Section, StatusPill } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/learn/$courseId")({
  head: () => ({ meta: [{ title: "Course — Brightpath" }] }),
  component: CoursePlayer,
});

function useCourseContent(courseId: string, userId: string) {
  return useQuery({
    queryKey: ["course-content", courseId, userId],
    queryFn: async () => {
      const [course, modules, lessons, progress, assessments, submissions, sessions, announcements] = await Promise.all([
        supabase.from("courses").select("*, subjects(name), grade_levels(name), instructor:profiles!courses_instructor_id_fkey(id, full_name)").eq("id", courseId).maybeSingle(),
        supabase.from("modules").select("*").eq("course_id", courseId).order("position"),
        supabase.from("lessons").select("*").eq("course_id", courseId).order("position"),
        supabase.from("lesson_progress").select("lesson_id").eq("course_id", courseId).eq("student_id", userId),
        supabase.from("assessments").select("*").eq("course_id", courseId).order("due_at", { nullsFirst: false }),
        supabase.from("submissions").select("assessment_id, status, total_score, max_score").eq("course_id", courseId).eq("student_id", userId),
        supabase.from("live_sessions").select("*").eq("course_id", courseId).order("starts_at"),
        supabase.from("announcements").select("*").eq("course_id", courseId).order("created_at", { ascending: false }).limit(5),
      ]);
      return {
        course: unwrap(course),
        modules: unwrap(modules),
        lessons: unwrap(lessons),
        done: new Set(unwrap(progress).map((p) => p.lesson_id)),
        assessments: unwrap(assessments),
        submissions: unwrap(submissions),
        sessions: unwrap(sessions),
        announcements: unwrap(announcements),
      };
    },
  });
}

function CoursePlayer() {
  const { courseId } = Route.useParams();
  const me = useMe();
  const qc = useQueryClient();
  const q = useCourseContent(courseId, me.id);
  const [lessonId, setLessonId] = useState<string | null>(null);

  if (q.isLoading) return <Loading />;
  if (q.error) return <EmptyState title="Couldn't load this course" description={q.error.message} />;
  const d = q.data!;
  if (!d.course) return <EmptyState title="Course not found" />;
  if (d.lessons.length === 0 && d.modules.length === 0 && d.assessments.length === 0) {
    return (
      <EmptyState
        title="You don't have access to this course yet"
        description="Enroll to unlock the lessons."
        action={<Button asChild variant="hero"><Link to="/courses/$courseId" params={{ courseId }}>See course</Link></Button>}
      />
    );
  }

  const c = d.course;
  const current = d.lessons.find((l) => l.id === lessonId) ?? d.lessons.find((l) => !d.done.has(l.id)) ?? d.lessons[0];
  const pct = d.lessons.length ? Math.round((d.done.size / d.lessons.length) * 100) : 0;
  const now = Date.now();
  const isStudent = me.roles.includes("student");

  async function toggleDone(id: string) {
    const ok = d.done.has(id)
      ? await act(supabase.from("lesson_progress").delete().eq("lesson_id", id).eq("student_id", me.id))
      : await act(supabase.from("lesson_progress").insert({ lesson_id: id, course_id: courseId, student_id: me.id }), "Lesson completed!");
    if (ok) {
      await qc.invalidateQueries({ queryKey: ["course-content", courseId] });
      await qc.invalidateQueries({ queryKey: ["student-overview"] });
      if (!d.done.has(id)) {
        const idx = d.lessons.findIndex((l) => l.id === id);
        const next = d.lessons[idx + 1];
        if (next) setLessonId(next.id);
      }
    }
  }

  const video = embedUrl(current?.video_url);

  return (
    <div>
      <PageHeader
        eyebrow={`${c.subjects?.name ?? "Course"} · ${c.grade_levels?.name ?? ""}`}
        title={c.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Pill tone={c.delivery_mode === "guided" ? "sun" : "teal"}>{MODE_LABEL[c.delivery_mode]}</Pill>
            {c.instructor && <span className="text-sm">Teacher: <b>{c.instructor.full_name}</b></span>}
          </span>
        }
        actions={
          c.instructor && (
            <Button asChild variant="outline">
              <Link to="/messages" search={{ to: c.instructor.id }}><MessageSquare /> Message teacher</Link>
            </Button>
          )
        }
      />

      {c.delivery_mode === "guided" && (
        <div className="pop-card-flat mb-6 flex items-start gap-3 bg-sun-soft p-4 text-sm">
          <Users className="mt-0.5 size-5 shrink-0" />
          <p>This is a <b>teacher-guided</b> course. Your teacher leads each lesson in a live class — a grown-up can help open the lessons below for practice at home.</p>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
        <aside className="grid h-fit gap-4">
          <div className="pop-card p-4">
            <p className="text-sm font-bold">Your progress</p>
            <div className="mt-2 flex items-center gap-2"><ProgressBar value={pct} /><span className="text-sm font-bold">{pct}%</span></div>
          </div>
          <nav className="pop-card p-3">
            {d.modules.map((m) => (
              <div key={m.id} className="mb-3 last:mb-0">
                <p className="px-2 py-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">{m.title}</p>
                <ul>
                  {d.lessons.filter((l) => l.module_id === m.id).map((l) => (
                    <li key={l.id}>
                      <button
                        onClick={() => setLessonId(l.id)}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-accent",
                          current?.id === l.id && "bg-sun-soft font-semibold",
                        )}
                      >
                        {d.done.has(l.id) ? <CheckCircle2 className="size-4 shrink-0 text-teal" /> : <Circle className="size-4 shrink-0 text-muted-foreground" />}
                        {l.title}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </aside>

        <div className="min-w-0">
          {current ? (
            <article className="pop-card mb-10 overflow-hidden">
              {video && (
                <div className="aspect-video border-b-2 border-ink bg-ink">
                  <iframe src={video} title={current.title} className="size-full" allowFullScreen allow="accelerometer; encrypted-media; picture-in-picture" />
                </div>
              )}
              <div className="p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h2 className="font-display text-2xl font-bold">{current.title}</h2>
                  {current.duration_min && <Pill>{current.duration_min} min</Pill>}
                </div>
                <p className="mt-4 whitespace-pre-line leading-relaxed">{current.content}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {current.video_url && !video && (
                    <Button asChild variant="outline" size="sm"><a href={current.video_url} target="_blank" rel="noreferrer">Watch video <ExternalLink /></a></Button>
                  )}
                  {current.document_url && (
                    <Button asChild variant="outline" size="sm"><a href={current.document_url} target="_blank" rel="noreferrer"><FileText /> Open document</a></Button>
                  )}
                </div>
                {isStudent && (
                  <Button variant={d.done.has(current.id) ? "outline" : "teal"} className="mt-6" onClick={() => toggleDone(current.id)}>
                    <CheckCircle2 /> {d.done.has(current.id) ? "Mark as not done" : "Mark complete"}
                  </Button>
                )}
              </div>
            </article>
          ) : (
            <EmptyState title="Lessons are coming soon" />
          )}

          <Section title="Assessments">
            {d.assessments.length === 0 ? (
              <EmptyState title="No assessments yet" />
            ) : (
              <ul className="grid gap-2">
                {d.assessments.map((a) => {
                  const s = d.submissions.find((x) => x.assessment_id === a.id);
                  const overdue = !s && a.due_at && new Date(a.due_at).getTime() < now;
                  const sp = scorePct(s?.total_score, s?.max_score);
                  return (
                    <li key={a.id} className="pop-card-flat flex flex-wrap items-center justify-between gap-3 p-4">
                      <div>
                        <p className="font-semibold">{a.title}</p>
                        <p className="text-xs text-muted-foreground capitalize">{a.kind} · due {dateShort(a.due_at)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {s ? <StatusPill status={s.status} /> : overdue ? <Pill tone="coral">overdue</Pill> : null}
                        {sp != null && <span className="font-bold">{sp}%</span>}
                        <Button asChild size="sm" variant={s ? "outline" : "soft"}>
                          <Link to="/assessments/$assessmentId" params={{ assessmentId: a.id }}>{s ? "View result" : "Start"}</Link>
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>

          {(c.live_sessions_enabled || d.sessions.length > 0) && (
            <Section title="Live classes">
              {d.sessions.length === 0 ? (
                <EmptyState title="No live classes scheduled yet" />
              ) : (
                <ul className="grid gap-2">
                  {d.sessions.map((s) => {
                    const past = new Date(s.starts_at).getTime() + s.duration_min * 60_000 < now;
                    return (
                      <li key={s.id} className={cn("pop-card-flat flex flex-wrap items-center justify-between gap-3 p-4", past && "opacity-60")}>
                        <div className="flex items-start gap-3">
                          <CalendarClock className="mt-0.5 size-5 text-teal" />
                          <div>
                            <p className="font-semibold">{s.title}</p>
                            <p className="text-xs text-muted-foreground">{dateTime(s.starts_at)} · {s.duration_min} min</p>
                            {s.notes && <p className="mt-1 text-sm text-muted-foreground">{s.notes}</p>}
                          </div>
                        </div>
                        {!past && s.meeting_url && (
                          <Button asChild size="sm" variant="teal"><a href={s.meeting_url} target="_blank" rel="noreferrer">Join <ExternalLink /></a></Button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </Section>
          )}

          {d.announcements.length > 0 && (
            <Section title="Announcements">
              <ul className="grid gap-2">
                {d.announcements.map((a) => (
                  <li key={a.id} className="pop-card-flat flex gap-3 p-4">
                    <Megaphone className="mt-0.5 size-5 shrink-0 text-coral" />
                    <div>
                      <p className="font-semibold">{a.title}</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-line">{a.body}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{dateShort(a.created_at)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}
