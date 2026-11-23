import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { unwrap } from "@/lib/session";
import { act } from "@/lib/actions";
import { ago } from "@/lib/format";
import { EmptyState, Loading, PageHeader, Pill, Section, StatusPill } from "@/components/ui-kit";
import { RoleGate, TableCard } from "@/components/admin-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/teach/grading")({
  head: () => ({ meta: [{ title: "Grading — Brightpath" }, { name: "description", content: "Mark written answers and give feedback." }] }),
  component: () => (
    <RoleGate roles={["instructor", "platform_admin"]}>
      <Grading />
    </RoleGate>
  ),
});

function Grading() {
  const qc = useQueryClient();
  const [open, setOpen] = useState<string | null>(null);
  const subs = useQuery({
    queryKey: ["grading-queue"],
    queryFn: async () =>
      unwrap(
        await supabase
          .from("submissions")
          .select("*, assessments(title), courses(title, instructor_id), student:profiles!submissions_student_id_fkey(full_name)")
          .order("submitted_at", { ascending: false })
          .limit(200),
      ),
  });
  const all = subs.data ?? [];
  const waiting = all.filter((s) => s.status !== "graded");
  const graded = all.filter((s) => s.status === "graded").slice(0, 30);

  return (
    <div>
      <PageHeader eyebrow="Teaching" title="Grading" description="Quizzes are marked automatically. Written answers wait here for you to mark and leave feedback." />
      {subs.isLoading ? <Loading /> : (
        <>
          <Section title={`Waiting for marking (${waiting.length})`}>
            {waiting.length === 0 ? <EmptyState title="All caught up" description="No work is waiting to be marked." /> : (
              <TableCard head={["Student", "Assessment", "Course", "Submitted", ""]}>
                {waiting.map((s) => (
                  <tr key={s.id}>
                    <td className="font-semibold">{s.student?.full_name}</td>
                    <td>{s.assessments?.title}</td>
                    <td>{s.courses?.title}</td>
                    <td className="whitespace-nowrap">{ago(s.submitted_at)}</td>
                    <td><Button size="sm" onClick={() => setOpen(s.id)}>Mark</Button></td>
                  </tr>
                ))}
              </TableCard>
            )}
          </Section>
          <Section title="Recently graded">
            {graded.length === 0 ? <EmptyState title="Nothing graded yet" /> : (
              <TableCard head={["Student", "Assessment", "Score", "Status", ""]}>
                {graded.map((s) => (
                  <tr key={s.id}>
                    <td>{s.student?.full_name}</td>
                    <td>{s.assessments?.title}</td>
                    <td>{Number(s.total_score ?? 0)} / {Number(s.max_score ?? 0)} {s.flagged && <Pill tone="coral">needs support</Pill>}</td>
                    <td><StatusPill status={s.status} /></td>
                    <td><Button size="sm" variant="outline" onClick={() => setOpen(s.id)}>Review</Button></td>
                  </tr>
                ))}
              </TableCard>
            )}
          </Section>
        </>
      )}
      {open && <GradeDialog id={open} onClose={async (saved) => { setOpen(null); if (saved) await qc.invalidateQueries({ queryKey: ["grading-queue"] }); }} />}
    </div>
  );
}

function GradeDialog({ id, onClose }: { id: string; onClose: (saved: boolean) => void }) {
  const data = useQuery({
    queryKey: ["grade-sub", id],
    queryFn: async () => {
      const sub = unwrap(await supabase.from("submissions").select("*").eq("id", id).single());
      const answers = unwrap(await supabase.from("answers").select("*, questions(prompt, kind, marks, rubric, position)").eq("submission_id", id));
      answers.sort((a, b) => (a.questions?.position ?? 0) - (b.questions?.position ?? 0));
      return { sub, answers };
    },
  });
  const [marks, setMarks] = useState<Record<string, string>>({});
  const [fb, setFb] = useState<Record<string, string>>({});
  const [overall, setOverall] = useState<string | null>(null);

  async function save() {
    const written = (data.data?.answers ?? []).filter((a) => a.questions?.kind === "written");
    const grades = written.map((a) => ({ answer_id: a.id, marks: Number(marks[a.id] ?? a.marks_awarded ?? 0), feedback: fb[a.id] ?? a.feedback ?? "" }));
    const ok = await act(supabase.rpc("grade_submission", { _submission_id: id, _grades: grades, _feedback: overall ?? data.data?.sub.feedback ?? "" }), "Grade saved and student notified");
    if (ok) onClose(true);
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose(false)}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>Mark submission</DialogTitle></DialogHeader>
        {!data.data ? <Loading /> : (
          <div className="grid gap-4">
            {data.data.answers.map((a, i) => (
              <div key={a.id} className="rounded-lg border-2 border-border p-3 text-sm">
                <p className="font-semibold">{i + 1}. {a.questions?.prompt} <span className="text-muted-foreground">({Number(a.questions?.marks ?? 0)} marks)</span></p>
                <p className="mt-2 whitespace-pre-wrap rounded bg-muted p-2">{a.response || "—"}</p>
                {a.questions?.kind === "written" ? (
                  <div className="mt-2 grid gap-2">
                    {a.questions.rubric && <p className="text-xs text-muted-foreground">Criteria: {a.questions.rubric}</p>}
                    <div className="flex gap-2">
                      <Input type="number" min={0} max={Number(a.questions.marks)} step="0.5" className="w-24" placeholder="Marks" value={marks[a.id] ?? a.marks_awarded?.toString() ?? ""} onChange={(e) => setMarks({ ...marks, [a.id]: e.target.value })} />
                      <Input placeholder="Feedback on this answer" value={fb[a.id] ?? a.feedback ?? ""} onChange={(e) => setFb({ ...fb, [a.id]: e.target.value })} />
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 text-xs">{a.is_correct ? "✓ Correct" : "✗ Incorrect"} · {Number(a.marks_awarded ?? 0)} marks (automatic)</p>
                )}
              </div>
            ))}
            <Textarea rows={3} placeholder="Overall feedback for the student" value={overall ?? data.data.sub.feedback ?? ""} onChange={(e) => setOverall(e.target.value)} />
          </div>
        )}
        <DialogFooter><Button onClick={save}>Save grade</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
