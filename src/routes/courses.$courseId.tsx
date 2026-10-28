import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Check, Users, Sparkles, Video } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PublicFooter, PublicHeader, useSignedIn } from "@/components/public-header";
import { Button } from "@/components/ui/button";
import { EmptyState, Loading, Pill } from "@/components/ui-kit";
import { bandFor } from "@/components/course-card";
import { money } from "@/lib/format";
import { MODE_LABEL } from "@/lib/catalog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/courses/$courseId")({
  head: () => ({
    meta: [
      { title: "Course details — Brightpath Academy" },
      { name: "description", content: "Syllabus, learning style, live classes and pricing for this Brightpath course." },
      { property: "og:title", content: "Course details — Brightpath Academy" },
      { property: "og:description", content: "See what's inside this course and enroll." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CoursePage,
});

function CoursePage() {
  const { courseId } = Route.useParams();
  const signedIn = useSignedIn();

  const course = useQuery({
    queryKey: ["public-course", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*, subjects(name), grade_levels(name), academic_periods(name), modules(id, title, position)")
        .eq("id", courseId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const enrollment = useQuery({
    queryKey: ["my-enrollment", courseId, signedIn],
    enabled: signedIn === true,
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase
        .from("enrollments")
        .select("id, status")
        .eq("course_id", courseId)
        .eq("student_id", u.user.id)
        .maybeSingle();
      return data;
    },
  });

  const c = course.data;
  const modules = [...(c?.modules ?? [])].sort((a, b) => a.position - b.position);
  const enrolled = enrollment.data?.status === "active";

  return (
    <div className="min-h-screen">
      <PublicHeader />
      {course.isLoading ? (
        <div className="mx-auto max-w-6xl px-4 md:px-8"><Loading /></div>
      ) : !c ? (
        <div className="mx-auto max-w-3xl px-4 py-16"><EmptyState title="Course not found" description="It may not be published yet." /></div>
      ) : (
        <>
          <section className={cn("relative border-b-2 border-ink", bandFor(c.id))}>
            <div className="dotted-bg absolute inset-0 opacity-50" />
            <div className="relative mx-auto max-w-6xl px-4 py-14 md:px-8">
              <div className="flex flex-wrap gap-2">
                <Pill tone="ink">{c.grade_levels?.name ?? "All grades"}</Pill>
                <Pill>{c.subjects?.name ?? "General"}</Pill>
              </div>
              <h1 className="mt-4 max-w-3xl font-display text-4xl font-extrabold md:text-5xl">{c.title}</h1>
              <p className="mt-3 max-w-2xl text-lg">{c.summary}</p>
            </div>
          </section>
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:px-8 lg:grid-cols-[1fr_340px]">
            <div>
              <h2 className="font-display text-2xl font-bold">About this course</h2>
              <p className="mt-3 whitespace-pre-line text-muted-foreground">{c.description}</p>
              <h2 className="mt-10 font-display text-2xl font-bold">What's inside</h2>
              <ol className="mt-4 grid gap-3">
                {modules.map((m, i) => (
                  <li key={m.id} className="pop-card-flat flex items-center gap-4 p-4">
                    <span className="flex size-9 items-center justify-center rounded-lg border-2 border-ink bg-sun-soft font-display font-bold">{i + 1}</span>
                    <span className="font-semibold">{m.title}</span>
                  </li>
                ))}
                {modules.length === 0 && <p className="text-sm text-muted-foreground">Syllabus coming soon.</p>}
              </ol>
            </div>
            <aside className="pop-card h-fit p-6 lg:sticky lg:top-24">
              <p className="font-display text-4xl font-extrabold">{money(c.price, c.currency)}</p>
              <ul className="mt-5 grid gap-2 text-sm">
                <li className="flex items-center gap-2">
                  {c.delivery_mode === "guided" ? <Users className="size-4 text-teal" /> : <Sparkles className="size-4 text-teal" />}
                  {MODE_LABEL[c.delivery_mode]}
                </li>
                {c.live_sessions_enabled && <li className="flex items-center gap-2"><Video className="size-4 text-teal" /> Live classes with a teacher</li>}
                <li className="flex items-center gap-2"><BookOpen className="size-4 text-teal" /> {modules.length} modules</li>
                {c.academic_periods?.name && <li className="flex items-center gap-2"><Check className="size-4 text-teal" /> {c.academic_periods.name}</li>}
              </ul>
              <div className="mt-6 grid gap-2">
                {enrolled ? (
                  <Button asChild variant="teal" size="lg">
                    <Link to="/learn/$courseId" params={{ courseId: c.id }}>Go to course</Link>
                  </Button>
                ) : signedIn ? (
                  <Button asChild variant="hero" size="lg">
                    <Link to="/checkout" search={{ courseId: c.id }}>Enroll now</Link>
                  </Button>
                ) : (
                  <Button asChild variant="hero" size="lg">
                    <Link to="/auth" search={{ mode: "signup", redirect: `/checkout?courseId=${c.id}` }}>Sign up to enroll</Link>
                  </Button>
                )}
                <p className="text-center text-xs text-muted-foreground">Parents can enroll a linked child at checkout.</p>
              </div>
            </aside>
          </div>
        </>
      )}
      <PublicFooter />
    </div>
  );
}
