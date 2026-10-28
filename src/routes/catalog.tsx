import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, Package } from "lucide-react";
import { PublicFooter, PublicHeader } from "@/components/public-header";
import { CourseCard } from "@/components/course-card";
import { catalogQuery, plansQuery, subjectsQuery } from "@/lib/catalog";
import { useGradeLevels } from "@/components/onboarding";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState, Loading, Pill } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { money } from "@/lib/format";

export const Route = createFileRoute("/catalog")({
  head: () => ({
    meta: [
      { title: "Course catalog — Brightpath Academy" },
      { name: "description", content: "Browse published courses from Pre-KG to Grade 12 by grade, subject and learning style." },
      { property: "og:title", content: "Course catalog — Brightpath Academy" },
      { property: "og:description", content: "Find the right course for every grade, from phonics to Algebra I." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Catalog,
});

function Catalog() {
  const catalog = useQuery(catalogQuery);
  const subjects = useQuery(subjectsQuery);
  const grades = useGradeLevels();
  const plans = useQuery(plansQuery);
  const [q, setQ] = useState("");
  const [grade, setGrade] = useState("all");
  const [subject, setSubject] = useState("all");
  const [mode, setMode] = useState("all");

  const filtered = useMemo(() => {
    return (catalog.data ?? []).filter((c) => {
      if (grade !== "all" && c.grade_level_id !== grade) return false;
      if (subject !== "all" && c.subject_id !== subject) return false;
      if (mode !== "all" && c.delivery_mode !== mode) return false;
      if (q && !`${c.title} ${c.summary}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [catalog.data, grade, subject, mode, q]);

  return (
    <div className="min-h-screen">
      <PublicHeader />
      <div className="mx-auto max-w-6xl px-4 py-12 md:px-8">
        <h1 className="font-display text-4xl font-extrabold md:text-5xl">Find a course</h1>
        <p className="mt-2 text-muted-foreground">Every course here has been reviewed and approved by our academic team.</p>

        <div className="pop-card-flat mt-8 grid gap-3 p-4 md:grid-cols-[1fr_repeat(3,180px)]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search courses" value={q} onChange={(e) => setQ(e.target.value)} className="border-2 pl-9" />
          </div>
          <Select value={grade} onValueChange={setGrade}>
            <SelectTrigger className="border-2"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All grades</SelectItem>
              {(grades.data ?? []).map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={subject} onValueChange={setSubject}>
            <SelectTrigger className="border-2"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All subjects</SelectItem>
              {(subjects.data ?? []).map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={mode} onValueChange={setMode}>
            <SelectTrigger className="border-2"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any style</SelectItem>
              <SelectItem value="guided">Teacher-guided</SelectItem>
              <SelectItem value="self_paced">Self-paced</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="mt-8">
          {catalog.isLoading ? (
            <Loading />
          ) : filtered.length === 0 ? (
            <EmptyState title="No courses match" description="Try a different grade or subject." />
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((c) => <CourseCard key={c.id} course={c} />)}
            </div>
          )}
        </div>

        {(plans.data ?? []).length > 0 && (
          <section className="mt-16">
            <h2 className="font-display text-3xl font-extrabold">Bundles & term passes</h2>
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              {(plans.data ?? []).map((p) => (
                <div key={p.id} className="pop-card flex flex-col gap-3 bg-sun-soft p-6">
                  <div className="flex items-center gap-2">
                    <Package className="size-5 text-teal" />
                    <Pill tone="ink">{p.kind}</Pill>
                  </div>
                  <h3 className="font-display text-2xl font-bold">{p.name}</h3>
                  <p className="text-muted-foreground">{p.description}</p>
                  <p className="text-sm text-muted-foreground">{p.course_ids.length} courses included</p>
                  <div className="mt-auto flex items-center justify-between pt-2">
                    <span className="font-display text-3xl font-extrabold">{money(p.amount, p.currency)}</span>
                    <Button asChild variant="pop">
                      <Link to="/checkout" search={{ planId: p.id }}>Get this plan</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
      <PublicFooter />
    </div>
  );
}
