import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe, unwrap } from "@/lib/session";
import { scorePct } from "@/lib/actions";
import { dateShort, dateTime } from "@/lib/format";
import { EmptyState, Loading, PageHeader, Pill, StatusPill } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/assessments/$assessmentId")({
  head: () => ({ meta: [{ title: "Assessment — Brightpath" }] }),
  component: AssessmentPage,
});

const KIND_LABEL: Record<string, string> = { mcq: "Multiple choice", true_false: "True / false", written: "Written answer" };

function AssessmentPage() {
  const { assessmentId } = Route.useParams();
  const me = useMe();
  const qc = useQueryClient();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const q = useQuery({
    queryKey: ["assessment", assessmentId, me.id],
    queryFn: async () => {
      const aRes = await supabase.from("assessments").select("*, courses(id, title)").eq("id", assessmentId).maybeSingle();
      if (aRes.error) throw new Error(aRes.error.message);
      const a = aRes.data;
      const questions = unwrap(await supabase.from("questions").select("*").eq("assessment_id", assessmentId).order("position"));
      const subRes = await supabase.from("submissions").select("*").eq("assessment_id", assessmentId).eq("student_id", me.id).maybeSingle();
      if (subRes.error) throw new Error(subRes.error.message);
      const sub = subRes.data;
      const ans = sub ? unwrap(await supabase.from("answers").select("*").eq("submission_id", sub.id)) : [];
      return { a, questions, sub, ans };
    },
  });

  if (q.isLoading) return <Loading />;
  if (q.error) return <EmptyState title="Couldn't load this assessment" description={q.error.message} />;
  const { a, questions, sub, ans } = q.data!;
  if (!a) return <EmptyState title="Assessment not found" description="You may need to enroll in the course first." />;

  const back = a.courses && (
    <Button asChild variant="outline"><Link to="/learn/$courseId" params={{ courseId: a.courses.id }}><ArrowLeft /> Back to course</Link></Button>
  );
  const totalMarks = questions.reduce((s, x) => s + Number(x.marks), 0);

  async function submit() {
    const missing = questions.filter((x) => !(answers[x.id] ?? "").trim());
    if (missing.length && !confirm(`${missing.length} question(s) are unanswered. Submit anyway?`)) return;
    setBusy(true);
    const { error } = await supabase.rpc("submit_assessment", { _assessment_id: assessmentId, _answers: answers });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Submitted!");
    await qc.invalidateQueries({ queryKey: ["assessment", assessmentId] });
    await qc.invalidateQueries({ queryKey: ["student-overview"] });
    await qc.invalidateQueries({ queryKey: ["course-content"] });
  }

  if (sub) {
    const pct = scorePct(sub.total_score, sub.max_score);
    return (
      <div>
        <PageHeader eyebrow={a.courses?.title} title={a.title} actions={back} />
        <div className="pop-card mb-8 flex flex-wrap items-center gap-6 p-6">
          <div>
            <p className="text-sm text-muted-foreground">Your result</p>
            <p className="font-display text-4xl font-extrabold">{pct == null ? "Awaiting marking" : `${pct}%`}</p>
            {sub.total_score != null && <p className="text-sm text-muted-foreground">{Number(sub.total_score)} of {Number(sub.max_score)} marks</p>}
          </div>
          <div className="flex flex-col gap-1">
            <StatusPill status={sub.status} />
            {pct != null && (pct >= a.pass_mark ? <Pill tone="teal">passed</Pill> : <Pill tone="coral">below pass mark ({a.pass_mark}%)</Pill>)}
          </div>
          <p className="text-sm text-muted-foreground">Submitted {dateTime(sub.submitted_at)}</p>
        </div>
        {sub.feedback && (
          <div className="pop-card-flat mb-8 bg-teal-soft p-5">
            <p className="text-sm font-bold">Teacher feedback</p>
            <p className="mt-1 whitespace-pre-line">{sub.feedback}</p>
          </div>
        )}
        <ol className="grid gap-4">
          {questions.map((x, i) => {
            const an = ans.find((y) => y.question_id === x.id);
            return (
              <li key={x.id} className="pop-card-flat p-5">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold">{i + 1}. {x.prompt}</p>
                  <span className="shrink-0 text-sm font-bold">
                    {an?.marks_awarded == null ? "—" : Number(an.marks_awarded)} / {Number(x.marks)}
                  </span>
                </div>
                <p className={cn("mt-2 flex items-center gap-2 text-sm", an?.is_correct === true && "text-teal", an?.is_correct === false && "text-coral")}>
                  {an?.is_correct === true && <Check className="size-4" />}
                  {an?.is_correct === false && <X className="size-4" />}
                  <span className="whitespace-pre-line">Your answer: {an?.response || <i>no answer</i>}</span>
                </p>
                {an?.feedback && <p className="mt-2 rounded-lg bg-muted p-3 text-sm">{an.feedback}</p>}
              </li>
            );
          })}
        </ol>
      </div>
    );
  }

  if (!me.roles.includes("student")) {
    return (
      <div>
        <PageHeader eyebrow={a.courses?.title} title={a.title} actions={back} />
        <EmptyState title="Only enrolled students can take this assessment" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow={a.courses?.title}
        title={a.title}
        description={a.instructions}
        actions={back}
      />
      <div className="mb-6 flex flex-wrap gap-2">
        <Pill tone="sun">{a.kind}</Pill>
        <Pill>{questions.length} questions · {totalMarks} marks</Pill>
        <Pill>Pass mark {a.pass_mark}%</Pill>
        {a.due_at && <Pill tone={new Date(a.due_at) < new Date() ? "coral" : "neutral"}>Due {dateShort(a.due_at)}</Pill>}
      </div>
      {questions.length === 0 ? (
        <EmptyState title="No questions yet" />
      ) : (
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          {questions.map((x, i) => {
            const opts = Array.isArray(x.options) ? (x.options as string[]) : [];
            return (
              <fieldset key={x.id} className="pop-card p-5">
                <div className="flex items-start justify-between gap-3">
                  <legend className="font-semibold">{i + 1}. {x.prompt}</legend>
                  <span className="shrink-0 text-xs text-muted-foreground">{KIND_LABEL[x.kind]} · {Number(x.marks)} mark{Number(x.marks) === 1 ? "" : "s"}</span>
                </div>
                {x.kind === "written" ? (
                  <Textarea
                    className="mt-3 min-h-32"
                    value={answers[x.id] ?? ""}
                    onChange={(e) => setAnswers({ ...answers, [x.id]: e.target.value })}
                    placeholder="Write your answer…"
                  />
                ) : (
                  <RadioGroup value={answers[x.id] ?? ""} onValueChange={(v) => setAnswers({ ...answers, [x.id]: v })} className="mt-3 grid gap-2">
                    {(x.kind === "true_false" && opts.length === 0 ? ["True", "False"] : opts).map((o) => (
                      <label key={o} className={cn("flex cursor-pointer items-center gap-3 rounded-lg border-2 p-3 text-sm", answers[x.id] === o ? "border-ink bg-sun-soft" : "border-border")}>
                        <RadioGroupItem value={o} /> {o}
                      </label>
                    ))}
                  </RadioGroup>
                )}
              </fieldset>
            );
          })}
          <div>
            <Button type="submit" variant="hero" size="lg" disabled={busy}>Submit answers</Button>
            <p className="mt-2 text-xs text-muted-foreground">Multiple-choice and true/false answers are marked instantly. Written answers are marked by your teacher.</p>
          </div>
        </form>
      )}
    </div>
  );
}
