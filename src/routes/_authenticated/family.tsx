import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, HeartHandshake, MessageSquare, UserPlus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe, unwrap } from "@/lib/session";
import { act, myChildrenQuery, scorePct } from "@/lib/actions";
import { studentOverviewQuery } from "@/lib/student-overview";
import { dateShort, downloadCsv } from "@/lib/format";
import { EmptyState, Loading, NoAccess, PageHeader, Section, StatusPill } from "@/components/ui-kit";
import { StudentDashboard } from "@/components/student-dashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/family")({
  head: () => ({ meta: [{ title: "Family dashboard — Brightpath" }] }),
  component: FamilyPage,
});

function FamilyPage() {
  const me = useMe();
  const qc = useQueryClient();
  const children = useQuery(myChildrenQuery(me.id));
  const links = useQuery({
    queryKey: ["my-link-requests", me.id],
    queryFn: async () =>
      unwrap(await supabase.from("parent_links").select("*").eq("parent_id", me.id).neq("status", "verified").order("created_at", { ascending: false })),
  });
  const [active, setActive] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [relationship, setRelationship] = useState("parent");

  useEffect(() => {
    if (!active && children.data?.[0]) setActive(children.data[0].id);
  }, [children.data, active]);

  if (!me.roles.includes("parent")) return <NoAccess />;

  async function requestLink(e: React.FormEvent) {
    e.preventDefault();
    const clean = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(clean)) return;
    const ok = await act(
      supabase.from("parent_links").insert({ parent_id: me.id, student_email: clean, relationship }),
      "Request sent — an administrator will verify it",
    );
    if (ok) {
      setEmail("");
      await qc.invalidateQueries({ queryKey: ["my-link-requests"] });
    }
  }

  async function cancel(id: string) {
    if (await act(supabase.from("parent_links").delete().eq("id", id), "Request cancelled"))
      await qc.invalidateQueries({ queryKey: ["my-link-requests"] });
  }

  const kids = children.data ?? [];
  const child = kids.find((k) => k.id === active);

  return (
    <div>
      <PageHeader
        eyebrow="Family"
        title="Your family dashboard"
        description="Follow each child's courses, results, attendance and upcoming work."
      />

      {children.isLoading ? (
        <Loading />
      ) : kids.length === 0 ? (
        <EmptyState
          icon={<HeartHandshake className="size-8" />}
          title="No linked children yet"
          description="Send a link request using your child's student account email. A platform administrator verifies every request to protect children's privacy."
        />
      ) : (
        <>
          <div className="mb-8 flex flex-wrap gap-2">
            {kids.map((k) => (
              <button
                key={k.id}
                onClick={() => setActive(k.id)}
                className={cn(
                  "rounded-full border-2 px-4 py-2 text-sm font-bold transition-all",
                  active === k.id ? "border-ink bg-sun shadow-pop-sm" : "border-border bg-card hover:border-ink",
                )}
              >
                {k.full_name}
              </button>
            ))}
          </div>
          {child && (
            <>
              <ChildActions studentId={child.id} name={child.full_name} />
              <StudentDashboard studentId={child.id} viewer="parent" />
            </>
          )}
        </>
      )}

      <Section title="Link a child" className="mt-12">
        <div className="grid gap-6 lg:grid-cols-2">
          <form onSubmit={requestLink} className="pop-card grid gap-4 p-6">
            <div className="grid gap-1.5">
              <Label htmlFor="cemail">Child's student account email</Label>
              <Input id="cemail" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="child@example.com" maxLength={255} />
            </div>
            <div className="grid gap-1.5">
              <Label>Relationship</Label>
              <Select value={relationship} onValueChange={setRelationship}>
                <SelectTrigger className="border-2 bg-card"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="parent">Parent</SelectItem>
                  <SelectItem value="guardian">Guardian</SelectItem>
                  <SelectItem value="other">Other family member</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" variant="hero"><UserPlus /> Send link request</Button>
          </form>
          <div>
            <p className="mb-2 text-sm font-bold">Requests</p>
            {(links.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No open requests.</p>
            ) : (
              <ul className="grid gap-2">
                {links.data!.map((l) => (
                  <li key={l.id} className="pop-card-flat flex items-center justify-between gap-3 p-3">
                    <div>
                      <p className="text-sm font-semibold">{l.student_email}</p>
                      <p className="text-xs text-muted-foreground">Sent {dateShort(l.created_at)}{l.note ? ` · ${l.note}` : ""}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusPill status={l.status} />
                      {l.status === "pending" && (
                        <Button size="icon" variant="ghost" aria-label="Cancel request" onClick={() => cancel(l.id)}><X /></Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Section>
    </div>
  );
}

function ChildActions({ studentId, name }: { studentId: string; name: string }) {
  const q = useQuery(studentOverviewQuery(studentId));
  const teachers = Array.from(
    new Map(
      (q.data?.courses ?? [])
        .filter((c) => c.course?.instructor_id)
        .map((c) => [c.course!.instructor_id!, c.course!.title]),
    ),
  );
  const instructorNames = useQuery({
    queryKey: ["profiles-names", teachers.map((t) => t[0]).join(",")],
    enabled: teachers.length > 0,
    queryFn: async () => unwrap(await supabase.from("profiles").select("id, full_name").in("id", teachers.map((t) => t[0]))),
  });

  function exportReport() {
    const d = q.data;
    if (!d) return;
    const title = (id: string) => d.assessments.find((a) => a.id === id)?.title ?? "";
    const course = (id: string) => d.courses.find((c) => c.courseId === id)?.course?.title ?? "";
    downloadCsv(`${name.replace(/\s+/g, "-")}-progress-report`, [
      ...d.courses.map((c) => ({
        type: "course",
        course: c.course?.title,
        item: "Lesson progress",
        status: `${c.doneLessons}/${c.totalLessons} lessons`,
        score: c.progress + "%",
        date: "",
        feedback: "",
      })),
      ...d.submissions.map((s) => ({
        type: "assessment",
        course: course(s.course_id),
        item: title(s.assessment_id),
        status: s.status,
        score: scorePct(s.total_score, s.max_score) == null ? "" : scorePct(s.total_score, s.max_score) + "%",
        date: dateShort(s.submitted_at),
        feedback: s.feedback ?? "",
      })),
    ]);
  }

  return (
    <div className="mb-8 flex flex-wrap gap-2">
      <Button variant="outline" onClick={exportReport} disabled={!q.data}><Download /> Download progress report</Button>
      {(instructorNames.data ?? []).map((t) => (
        <Button key={t.id} asChild variant="soft">
          <Link to="/messages" search={{ to: t.id }}><MessageSquare /> Message {t.full_name}</Link>
        </Button>
      ))}
      <Button asChild variant="ghost"><Link to="/catalog">Find courses for {name.split(" ")[0]}</Link></Button>
    </div>
  );
}
