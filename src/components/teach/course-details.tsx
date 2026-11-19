import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Save, Send, Undo2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/lib/session";
import { act, gradeLevelsQuery, periodsQuery } from "@/lib/actions";
import { subjectsQuery } from "@/lib/catalog";
import { money } from "@/lib/format";
import { Field, NONE, fromSel, toSel } from "@/components/admin-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function CourseDetails({ course }: { course: Tables<"courses"> }) {
  const qc = useQueryClient();
  const grades = useQuery(gradeLevelsQuery);
  const subjects = useQuery(subjectsQuery);
  const periods = useQuery(periodsQuery);
  const [f, setF] = useState({
    title: course.title,
    summary: course.summary,
    description: course.description,
    subject_id: toSel(course.subject_id),
    grade_level_id: toSel(course.grade_level_id),
    period_id: toSel(course.period_id),
    delivery_mode: course.delivery_mode,
    live_sessions_enabled: course.live_sessions_enabled,
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));

  const refresh = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ["teach-course", course.id] }),
      qc.invalidateQueries({ queryKey: ["teach-courses"] }),
    ]);

  async function save() {
    const ok = await act(
      supabase
        .from("courses")
        .update({
          title: f.title.trim(),
          summary: f.summary,
          description: f.description,
          subject_id: fromSel(f.subject_id),
          grade_level_id: fromSel(f.grade_level_id),
          period_id: fromSel(f.period_id),
          delivery_mode: f.delivery_mode,
          live_sessions_enabled: f.live_sessions_enabled,
        })
        .eq("id", course.id),
      "Course saved",
    );
    if (ok) await refresh();
  }

  async function setStatus(status: "pending" | "draft") {
    const ok = await act(
      supabase.from("courses").update({ status }).eq("id", course.id),
      status === "pending" ? "Sent to the platform administrators for review" : "Review request withdrawn",
    );
    if (ok) await refresh();
  }

  return (
    <div className="grid gap-6">
      <div className="pop-card flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <p className="font-semibold">Approval</p>
          <p className="text-sm text-muted-foreground">
            Price: <b>{money(course.price, course.currency)}</b> (set by the finance team)
          </p>
        </div>
        <div className="flex gap-2">
          {(course.status === "draft" || course.status === "rejected") && (
            <Button onClick={() => setStatus("pending")}><Send /> Submit for review</Button>
          )}
          {course.status === "pending" && (
            <Button variant="outline" onClick={() => setStatus("draft")}><Undo2 /> Withdraw</Button>
          )}
        </div>
      </div>

      <div className="pop-card grid gap-4 p-6 md:grid-cols-2">
        <div className="md:col-span-2"><Field label="Title"><Input value={f.title} onChange={(e) => set("title", e.target.value)} /></Field></div>
        <div className="md:col-span-2"><Field label="Short summary" hint="Shown on the catalog card."><Input value={f.summary} onChange={(e) => set("summary", e.target.value)} /></Field></div>
        <div className="md:col-span-2"><Field label="Full description"><Textarea rows={5} value={f.description} onChange={(e) => set("description", e.target.value)} /></Field></div>
        <Field label="Subject">
          <Select value={f.subject_id} onValueChange={(v) => set("subject_id", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>None</SelectItem>
              {(subjects.data ?? []).map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Grade level">
          <Select value={f.grade_level_id} onValueChange={(v) => set("grade_level_id", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>None</SelectItem>
              {(grades.data ?? []).map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Academic period">
          <Select value={f.period_id} onValueChange={(v) => set("period_id", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Any time</SelectItem>
              {(periods.data ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Learning style">
          <Select value={f.delivery_mode} onValueChange={(v) => set("delivery_mode", v as typeof f.delivery_mode)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="guided">Teacher-guided</SelectItem>
              <SelectItem value="self_paced">Self-paced</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <label className="flex items-center justify-between gap-4 md:col-span-2">
          <span>
            <span className="block font-semibold">Live classes</span>
            <span className="text-sm text-muted-foreground">Offer scheduled live sessions with a meeting link.</span>
          </span>
          <Switch checked={f.live_sessions_enabled} onCheckedChange={(v) => set("live_sessions_enabled", v)} />
        </label>
        <div className="md:col-span-2"><Button onClick={save} disabled={!f.title.trim()}><Save /> Save details</Button></div>
      </div>
    </div>
  );
}
