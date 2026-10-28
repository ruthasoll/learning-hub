import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BellRing, ClipboardCheck, HeartHandshake, ShieldCheck, Sparkles, Users, Video } from "lucide-react";
import heroImg from "@/assets/hero-learning.jpg";
import { PublicFooter, PublicHeader } from "@/components/public-header";
import { Button } from "@/components/ui/button";
import { CourseCard } from "@/components/course-card";
import { catalogQuery } from "@/lib/catalog";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Brightpath Academy — Online school from Pre-KG to Grade 12" },
      {
        name: "description",
        content:
          "Teacher-guided lessons for Pre-KG to Grade 4, self-paced courses for Grades 5–12, live classes and a family dashboard.",
      },
      { property: "og:title", content: "Brightpath Academy — Pre-KG to Grade 12" },
      {
        property: "og:description",
        content: "Real teachers, auto-graded quizzes and progress you can actually see.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const BANDS = [
  {
    grades: "Pre-KG – Grade 4",
    title: "Teacher-guided",
    body: "Short, warm sessions led by a teacher, with simple activities for home.",
    icon: Users,
    tone: "bg-sun",
  },
  {
    grades: "Grades 5 – 12",
    title: "Self-paced",
    body: "Learn on your schedule with quick checks after every lesson and optional live help.",
    icon: Sparkles,
    tone: "bg-teal",
  },
];

const FEATURES = [
  { icon: ClipboardCheck, title: "Instant quiz results", body: "Multiple-choice and true/false are marked the moment you submit. Teachers mark written work with feedback." },
  { icon: Video, title: "Live classes", body: "Scheduled sessions with a meeting link, plus attendance families can see." },
  { icon: HeartHandshake, title: "Family dashboard", body: "Parents see progress, scores, deadlines and teacher notes — for their own children only." },
  { icon: BellRing, title: "Early support alerts", body: "If a learner is struggling, their teacher and family hear about it early." },
  { icon: ShieldCheck, title: "Reviewed content", body: "Every course is reviewed and approved by our academic team before it goes live." },
];

function Index() {
  const catalog = useQuery(catalogQuery);
  const featured = (catalog.data ?? []).slice(0, 3);

  return (
    <div className="min-h-screen">
      <PublicHeader />

      <section className="dotted-bg border-b-2 border-ink">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:px-8 lg:grid-cols-2 lg:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border-2 border-ink bg-card px-3 py-1 text-xs font-bold shadow-pop-sm">
              <span className="size-2 rounded-full bg-teal" /> Enrolling now for Term 1
            </span>
            <h1 className="mt-6 font-display text-5xl font-extrabold leading-[1.02] md:text-6xl">
              School that grows <span className="marker">with your child.</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg text-muted-foreground">
              From first letters in Pre-KG to exam prep in Grade 12 — real teachers, clear progress and
              courses reviewed by educators.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="hero" size="lg">
                <Link to="/catalog">
                  Explore courses <ArrowRight />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/auth" search={{ mode: "signup" }}>
                  Create a family account
                </Link>
              </Button>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -right-3 -top-3 hidden size-20 rounded-full border-2 border-ink bg-sun animate-float md:block" />
            <img
              src={heroImg}
              alt="A teacher helping a young child with letter blocks while teenagers learn on a laptop"
              width={1408}
              height={1056}
              className="relative w-full rounded-3xl border-2 border-ink shadow-pop-lg"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 md:px-8">
        <h2 className="font-display text-3xl font-extrabold md:text-4xl">Two ways to learn, one place</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {BANDS.map((b) => (
            <div key={b.title} className="pop-card overflow-hidden">
              <div className={`flex items-center gap-3 border-b-2 border-ink px-6 py-4 ${b.tone}`}>
                <b.icon className="size-6" />
                <span className="font-bold">{b.grades}</span>
              </div>
              <div className="p-6">
                <h3 className="font-display text-2xl font-bold">{b.title}</h3>
                <p className="mt-2 text-muted-foreground">{b.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y-2 border-ink bg-ink text-ink-foreground">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 md:grid-cols-2 md:px-8 lg:grid-cols-5">
          {FEATURES.map((f) => (
            <div key={f.title}>
              <span className="inline-flex size-11 items-center justify-center rounded-xl border-2 border-sun bg-sun text-sun-foreground">
                <f.icon className="size-5" />
              </span>
              <h3 className="mt-4 font-display text-lg font-bold">{f.title}</h3>
              <p className="mt-1 text-sm text-ink-foreground/70">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {featured.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-16 md:px-8">
          <div className="flex items-end justify-between gap-4">
            <h2 className="font-display text-3xl font-extrabold md:text-4xl">Popular this term</h2>
            <Link to="/catalog" className="text-sm font-bold underline">
              See all courses
            </Link>
          </div>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {featured.map((c) => (
              <CourseCard key={c.id} course={c} />
            ))}
          </div>
        </section>
      )}

      <PublicFooter />
    </div>
  );
}
