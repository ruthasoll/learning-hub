import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { unwrap, useMe } from "@/lib/session";
import { act } from "@/lib/actions";
import { dateShort } from "@/lib/format";
import { EmptyState, Loading, PageHeader, Pill, Section, StatusPill } from "@/components/ui-kit";
import { Field, RoleGate, TableCard } from "@/components/admin-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/teach/students")({
  head: () => ({ meta: [{ title: "Student support — Brightpath" }, { name: "description", content: "Spot students who need help and record support plans." }] }),
  component: () => (
    <RoleGate roles={["instructor", "platform_admin"]}>
      <Support />
    </RoleGate>
  ),
});

type Target = { student_id: string; student_name: string; course_id: string; course_title: string };

function Support() {
  const me = useMe();
  const qc = useQueryClient();
  const [target, setTarget] = useState<Target | null>(null);
  const [form, setForm] = useState({ concern: "", action: "", follow_up_on: "", share: false });
  const needing = useQuery({ queryKey: ["support-needing"], queryFn: async () => unwrap(await supabase.rpc("students_needing_support", {})) });
  const plans = useQuery({
    queryKey: ["interventions"],
    queryFn: async () => unwrap(await supabase.from("interventions").select("*, student:profiles!interventions_student_id_fkey(full_name), courses(title)").order("created_at", { ascending: false })),
  });

  async function save() {
    if (!target) return;
    if (!form.concern.trim() || !form.action.trim()) return void toast.error("Describe the concern and the action");
    const ok = await act(
      supabase.from("interventions").insert({
        student_id: target.student_id, course_id: target.course_id, instructor_id: me.id,
        concern: form.concern.trim(), action: form.action.trim(), follow_up_on: form.follow_up_on || null, shared_with_parent: form.share,
      }),
      "Support plan saved",
    );
    if (ok) { setTarget(null); setForm({ concern: "", action: "", follow_up_on: "", share: false }); await qc.invalidateQueries({ queryKey: ["interventions"] }); }
  }
  async function close(id: string) {
    if (await act(supabase.from("interventions").update({ status: "resolved" }).eq("id", id), "Marked resolved")) await qc.invalidateQueries({ queryKey: ["interventions"] });
  }

  return (
    <div>
      <PageHeader eyebrow="Teaching" title="Student support" description="Students with low scores or overdue work appear here, so you can step in early." />
      <Section title="Students who may need help">
        {needing.isLoading ? <Loading /> : (needing.data ?? []).length === 0 ? <EmptyState title="Everyone is on track" /> : (
          <TableCard head={["Student", "Course", "Average", "Low scores", "Overdue", ""]}>
            {(needing.data ?? []).map((r) => (
              <tr key={r.student_id + r.course_id}>
                <td className="font-semibold">{r.student_name}</td>
                <td>{r.course_title}</td>
                <td>{r.avg_pct == null ? "—" : `${Math.round(Number(r.avg_pct))}%`}</td>
                <td>{Number(r.low_count) > 0 ? <Pill tone="coral">{r.low_count}</Pill> : 0}</td>
                <td>{Number(r.overdue_count) > 0 ? <Pill tone="sun">{r.overdue_count}</Pill> : 0}</td>
                <td className="flex gap-1">
                  <Button size="sm" onClick={() => setTarget(r)}>Add plan</Button>
                  <Button size="sm" variant="outline" asChild><Link to="/messages">Message</Link></Button>
                </td>
              </tr>
            ))}
          </TableCard>
        )}
      </Section>
      <Section title="Support plans">
        {(plans.data ?? []).length === 0 ? <EmptyState title="No plans yet" /> : (
          <TableCard head={["Student", "Course", "Concern", "Action", "Follow up", "Status", ""]}>
            {(plans.data ?? []).map((p) => (
              <tr key={p.id}>
                <td>{p.student?.full_name}</td>
                <td>{p.courses?.title ?? "—"}</td>
                <td className="max-w-56">{p.concern}</td>
                <td className="max-w-56">{p.action}{p.shared_with_parent && <p className="text-xs text-muted-foreground">Shared with parent</p>}</td>
                <td className="whitespace-nowrap">{dateShort(p.follow_up_on)}</td>
                <td><StatusPill status={p.status} /></td>
                <td>{p.status !== "resolved" && <Button size="sm" variant="outline" onClick={() => close(p.id)}>Resolve</Button>}</td>
              </tr>
            ))}
          </TableCard>
        )}
      </Section>
      <Dialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Support plan for {target?.student_name}</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <Field label="Concern"><Textarea rows={2} value={form.concern} onChange={(e) => setForm({ ...form, concern: e.target.value })} /></Field>
            <Field label="What you'll do"><Textarea rows={2} value={form.action} onChange={(e) => setForm({ ...form, action: e.target.value })} /></Field>
            <Field label="Follow-up date"><Input type="date" value={form.follow_up_on} onChange={(e) => setForm({ ...form, follow_up_on: e.target.value })} /></Field>
            <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.share} onCheckedChange={(v) => setForm({ ...form, share: v === true })} /> Share with the parent</label>
          </div>
          <DialogFooter><Button onClick={save}>Save plan</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
