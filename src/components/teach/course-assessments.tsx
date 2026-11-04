import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Pencil, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/lib/session";
import { act } from "@/lib/actions";
import { courseAssessmentsQuery } from "@/lib/teach";
import { dateTime } from "@/lib/format";
import { EmptyState, Loading, Pill } from "@/components/ui-kit";
import { Field } from "@/components/admin-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type ADraft = { id?: string; title: string; kind: string; instructions: string; due_at: string; pass_mark: string };
type QDraft = { id?: string; assessment_id: string; kind: "mcq" | "true_false" | "written"; prompt: string; options: string; marks: string; rubric: string; answer: string };

const KIND_LABEL: Record<string, string> = { mcq: "Multiple choice", true_false: "True / false", written: "Written answer" };

function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export function CourseAssessments({ courseId }: { courseId: string }) {
  const qc = useQueryClient();
  const data = useQuery(courseAssessmentsQuery(courseId));
  const [a, setA] = useState<ADraft | null>(null);
  const [q, setQ] = useState<QDraft | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ["teach-assessments", courseId] });

  if (data.isLoading) return <Loading />;
  const assessments = data.data?.assessments ?? [];
  const questions = data.data?.questions ?? [];
  const keys = data.data?.keys ?? [];

  async function saveAssessment() {
    if (!a) return;
    const row = {
      title: a.title.trim(),
      kind: a.kind,
      instructions: a.instructions,
      due_at: a.due_at ? new Date(a.due_at).toISOString() : null,
      pass_mark: Number(a.pass_mark) || 50,
    };
    const ok = a.id
      ? await act(supabase.from("assessments").update(row).eq("id", a.id), "Assessment saved")
      : await act(supabase.from("assessments").insert({ ...row, course_id: courseId }), "Assessment added");
    if (ok) {
      setA(null);
      await refresh();
    }
  }
  async function deleteAssessment(id: string) {
    if (!window.confirm("Delete this assessment, its questions and any submissions?")) return;
    if (await act(supabase.from("assessments").delete().eq("id", id), "Assessment deleted")) await refresh();
  }

  function editQuestion(x: Tables<"questions">) {
    const opts = Array.isArray(x.options) ? (x.options as string[]) : [];
    setQ({
      id: x.id,
      assessment_id: x.assessment_id,
      kind: x.kind as QDraft["kind"],
      prompt: x.prompt,
      options: opts.join("\n"),
      marks: String(x.marks),
      rubric: x.rubric ?? "",
      answer: keys.find((k) => k.question_id === x.id)?.correct_answer ?? "",
    });
  }
  async function saveQuestion() {
    if (!q) return;
    const options = q.kind === "true_false" ? ["True", "False"] : q.kind === "mcq" ? q.options.split("\n").map((s) => s.trim()).filter(Boolean) : [];
    if (q.kind !== "written" && !options.includes(q.answer)) {
      await act(Promise.resolve({ error: { message: "Pick the correct answer from the options" } }));
      return;
    }
    const row = { kind: q.kind, prompt: q.prompt.trim(), options, marks: Number(q.marks) || 1, rubric: q.kind === "written" ? q.rubric || null : null };
    let id = q.id;
    if (id) {
      if (!(await act(supabase.from("questions").update(row).eq("id", id)))) return;
    } else {
      const res = await supabase
        .from("questions")
        .insert({ ...row, assessment_id: q.assessment_id, course_id: courseId, position: questions.filter((x) => x.assessment_id === q.assessment_id).length + 1 })
        .select("id")
        .single();
      if (!(await act(Promise.resolve(res)))) return;
      id = res.data!.id;
    }
    if (q.kind === "written") {
      await supabase.from("question_keys").delete().eq("question_id", id);
    } else if (!(await act(supabase.from("question_keys").upsert({ question_id: id, course_id: courseId, correct_answer: q.answer })))) return;
    setQ(null);
    await refresh();
  }
  async function deleteQuestion(id: string) {
    if (await act(supabase.from("questions").delete().eq("id", id), "Question deleted")) await refresh();
  }

  const qOptions = q ? (q.kind === "true_false" ? ["True", "False"] : q.options.split("\n").map((s) => s.trim()).filter(Boolean)) : [];

  return (
    <div className="grid gap-5">
      <p className="text-sm text-muted-foreground">Multiple-choice and true/false questions are marked automatically. Written answers go to your grading queue.</p>
      {assessments.length === 0 && <EmptyState title="No assessments yet" description="Add a quiz, assignment or exam." />}
      {assessments.map((as) => {
        const qs = questions.filter((x) => x.assessment_id === as.id);
        const total = qs.reduce((n, x) => n + Number(x.marks), 0);
        return (
          <div key={as.id} className="pop-card p-5">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="mb-1 flex gap-1.5"><Pill tone="teal">{as.kind}</Pill><Pill>{total} marks</Pill><Pill>pass {as.pass_mark}%</Pill></div>
                <h3 className="font-display text-lg font-bold">{as.title}</h3>
                <p className="text-xs text-muted-foreground">Due {dateTime(as.due_at)}</p>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => setA({ id: as.id, title: as.title, kind: as.kind, instructions: as.instructions, due_at: toLocalInput(as.due_at), pass_mark: String(as.pass_mark) })}><Pencil /> Edit</Button>
                <Button size="icon" variant="ghost" aria-label="Delete assessment" onClick={() => deleteAssessment(as.id)}><Trash2 /></Button>
              </div>
            </div>
            <ol className="grid gap-2">
              {qs.map((x, i) => {
                const key = keys.find((k) => k.question_id === x.id);
                return (
                  <li key={x.id} className="flex items-start justify-between gap-2 rounded-lg border-2 border-border bg-background p-3 text-sm">
                    <div>
                      <p className="font-semibold">{i + 1}. {x.prompt}</p>
                      <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        {KIND_LABEL[x.kind]} · {Number(x.marks)} mark{Number(x.marks) === 1 ? "" : "s"}
                        {key && <span className="inline-flex items-center gap-1 text-foreground"><CheckCircle2 className="size-3 text-teal" /> {key.correct_answer}</span>}
                        {x.kind !== "written" && !key && <span className="font-bold text-destructive">No answer key</span>}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button size="icon" variant="ghost" aria-label="Edit question" onClick={() => editQuestion(x)}><Pencil /></Button>
                      <Button size="icon" variant="ghost" aria-label="Delete question" onClick={() => deleteQuestion(x.id)}><Trash2 /></Button>
                    </div>
                  </li>
                );
              })}
            </ol>
            <Button size="sm" variant="outline" className="mt-3" onClick={() => setQ({ assessment_id: as.id, kind: "mcq", prompt: "", options: "", marks: "1", rubric: "", answer: "" })}><Plus /> Add question</Button>
          </div>
        );
      })}
      <div><Button onClick={() => setA({ title: "", kind: "quiz", instructions: "", due_at: "", pass_mark: "50" })}><Plus /> New assessment</Button></div>

      <Dialog open={!!a} onOpenChange={(o) => !o && setA(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{a?.id ? "Edit assessment" : "New assessment"}</DialogTitle></DialogHeader>
          {a && (
            <div className="grid gap-4">
              <Field label="Title"><Input value={a.title} onChange={(e) => setA({ ...a, title: e.target.value })} /></Field>
              <Field label="Type">
                <Select value={a.kind} onValueChange={(v) => setA({ ...a, kind: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="quiz">Quiz</SelectItem><SelectItem value="assignment">Assignment</SelectItem><SelectItem value="exam">Exam</SelectItem></SelectContent>
                </Select>
              </Field>
              <Field label="Instructions"><Textarea rows={3} value={a.instructions} onChange={(e) => setA({ ...a, instructions: e.target.value })} /></Field>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Due date"><Input type="datetime-local" value={a.due_at} onChange={(e) => setA({ ...a, due_at: e.target.value })} /></Field>
                <Field label="Pass mark (%)"><Input type="number" min={0} max={100} value={a.pass_mark} onChange={(e) => setA({ ...a, pass_mark: e.target.value })} /></Field>
              </div>
            </div>
          )}
          <DialogFooter><Button onClick={saveAssessment} disabled={!a?.title.trim()}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!q} onOpenChange={(o) => !o && setQ(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{q?.id ? "Edit question" : "New question"}</DialogTitle></DialogHeader>
          {q && (
            <div className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Question type">
                  <Select value={q.kind} onValueChange={(v) => setQ({ ...q, kind: v as QDraft["kind"], answer: "" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(KIND_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Marks"><Input type="number" min={0} step="0.5" value={q.marks} onChange={(e) => setQ({ ...q, marks: e.target.value })} /></Field>
              </div>
              <Field label="Question"><Textarea rows={2} value={q.prompt} onChange={(e) => setQ({ ...q, prompt: e.target.value })} /></Field>
              {q.kind === "mcq" && (
                <Field label="Options" hint="One option per line."><Textarea rows={4} value={q.options} onChange={(e) => setQ({ ...q, options: e.target.value })} /></Field>
              )}
              {q.kind !== "written" ? (
                <Field label="Correct answer">
                  <Select value={q.answer} onValueChange={(v) => setQ({ ...q, answer: v })}>
                    <SelectTrigger><SelectValue placeholder="Choose the correct option" /></SelectTrigger>
                    <SelectContent>{qOptions.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
              ) : (
                <Field label="Grading criteria" hint="Shown to you while grading."><Textarea rows={3} value={q.rubric} onChange={(e) => setQ({ ...q, rubric: e.target.value })} /></Field>
              )}
            </div>
          )}
          <DialogFooter><Button onClick={saveQuestion} disabled={!q?.prompt.trim()}>Save question</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
