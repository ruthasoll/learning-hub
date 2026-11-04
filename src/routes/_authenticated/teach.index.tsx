import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Plus, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe, unwrap } from "@/lib/session";
import { gradeLevelsQuery } from "@/lib/actions";
import { subjectsQuery, MODE_LABEL } from "@/lib/catalog";
import { ago } from "@/lib/format";
import { EmptyState, Loading, PageHeader, Pill, StatCard, StatusPill } from "@/components/ui-kit";
import { Field, RoleGate } from "@/components/admin-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/teach/")({
  head: () => ({ meta: [{ title: "My courses — Brightpath" }] }),
  component: () => (
    <RoleGate roles={["instructor"]}>
      <TeachHome />
    </RoleGate>
  ),
});

function TeachHome() {
  const me = useMe();
  const navigate = useNavigate();
  const grades = useQuery(gradeLevelsQuery);
  const subjects = useQuery(subjectsQuery);
  const courses = useQuery({
    queryKey: ["teach-courses", me.id],
    queryFn: async () =>
      unwrap(
        await supabase
          .from("courses")
          .select("id, title, status, delivery_mode, updated_at, review_comment, subjects(name), grade_levels(name), enrollments(count)")
          .eq("instructor_id", me.id)
          .order("updated_at", { ascending: false }),
      ),
  });
  const pendingGrading = useQuery({
    queryKey: ["teach-pending-count", me.id],
    queryFn: async () => {
      const ids = (courses.data ?? []).map((c) => c.id);
      if (!ids.length) return 0;
      const { count } = await supabase.from("submissions").select("id", { count: "exact", head: true }).in("course_id", ids).eq("status", "submitted");
      return count ?? 0;
    },
    enabled: !!courses.data,
  });

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [grade, setGrade] = useState("");

  async function create() {
    const g = grades.data?.find((x) => x.id === grade);
    const { data, error } = await supabase
      .from("courses")
      .insert({ title: title.trim(), subject_id: subject || null, grade_level_id: grade || null, delivery_mode: g?.default_mode ?? "self_paced", instructor_id: me.id })
      .select("id")
      .single();
    if (error) return void toast.error(error.message);
    toast.success("Draft course created");
    navigate({ to: "/teach/$courseId", params: { courseId: data.id } });
  }

  const list = courses.data ?? [];
  const students = list.reduce((n, c) => n + ((c.enrollments as unknown as { count: number }[])[0]?.count ?? 0), 0);

  return (
    <div>
      <PageHeader
        eyebrow="Teaching"
        title="My courses"
        description="Build courses, send them for review, and follow your students' progress."
        actions={<Button onClick={() => setOpen(true)}><Plus /> New course</Button>}
      />
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <StatCard label="Courses" value={list.length} hint={`${list.filter((c) => c.status === "published").length} published`} icon={<BookOpen className="size-5" />} />
        <StatCard label="Students" value={students} icon={<Users className="size-5" />} tone="teal" />
        <StatCard label="Waiting to be graded" value={pendingGrading.data ?? 0} tone="sun" hint={<Link to="/teach/grading" className="underline">Open grading</Link>} />
      </div>

      {courses.isLoading ? (
        <Loading />
      ) : list.length === 0 ? (
        <EmptyState icon={<BookOpen className="size-8" />} title="No courses yet" description="Create your first course. It stays a private draft until you submit it for review." action={<Button onClick={() => setOpen(true)}><Plus /> New course</Button>} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((c) => (
            <Link key={c.id} to="/teach/$courseId" params={{ courseId: c.id }} className="pop-card block p-5 transition-transform hover:-translate-y-0.5">
              <div className="mb-2 flex flex-wrap gap-1.5">
                <StatusPill status={c.status} />
                <Pill>{c.grade_levels?.name ?? "No grade"}</Pill>
                <Pill>{MODE_LABEL[c.delivery_mode]}</Pill>
              </div>
              <h3 className="font-display text-lg font-bold">{c.title}</h3>
              <p className="text-sm text-muted-foreground">{c.subjects?.name ?? "No subject"} · updated {ago(c.updated_at)}</p>
              {c.status === "rejected" && c.review_comment && (
                <p className="mt-3 rounded-lg border-2 border-coral bg-coral-soft p-2 text-sm"><b>Reviewer:</b> {c.review_comment}</p>
              )}
            </Link>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New course</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <Field label="Course title"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Geometry Basics" /></Field>
            <Field label="Subject">
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger><SelectValue placeholder="Choose subject" /></SelectTrigger>
                <SelectContent>{(subjects.data ?? []).map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Grade level" hint="Pre-KG to Grade 4 courses start as teacher-guided; Grades 5–12 as self-paced.">
              <Select value={grade} onValueChange={setGrade}>
                <SelectTrigger><SelectValue placeholder="Choose grade" /></SelectTrigger>
                <SelectContent>{(grades.data ?? []).map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </div>
          <DialogFooter><Button onClick={create} disabled={!title.trim()}>Create draft</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
