import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { unwrap } from "@/lib/session";
import { act } from "@/lib/actions";
import { ago, moneyExact } from "@/lib/format";
import { EmptyState, Loading, PageHeader, Section, StatusPill } from "@/components/ui-kit";
import { RoleGate, TableCard } from "@/components/admin-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/finance/refunds")({
  head: () => ({ meta: [{ title: "Refunds — Brightpath" }, { name: "description", content: "Approve or decline refund requests." }] }),
  component: () => (
    <RoleGate roles={["finance_admin"]}>
      <Refunds />
    </RoleGate>
  ),
});

function Refunds() {
  const qc = useQueryClient();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const list = useQuery({
    queryKey: ["fin-refunds"],
    queryFn: async () => unwrap(await supabase.from("refund_requests").select("*, payments(amount, currency, courses(title)), requester:profiles!refund_requests_requested_by_fkey(full_name, email)").order("created_at", { ascending: false })),
  });
  async function decide(id: string, approve: boolean) {
    const note = notes[id]?.trim() ?? "";
    if (!approve && !note) return void toast.error("Add a reason before declining");
    if (await act(supabase.rpc("decide_refund_request", { _request_id: id, _approve: approve, _note: note }), approve ? "Refund issued" : "Request declined")) {
      await qc.invalidateQueries({ queryKey: ["fin-refunds"] });
      await qc.invalidateQueries({ queryKey: ["finance-overview"] });
    }
  }
  const all = list.data ?? [];
  const pending = all.filter((r) => r.status === "pending");
  const done = all.filter((r) => r.status !== "pending");
  return (
    <div>
      <PageHeader eyebrow="Finance" title="Refunds" description="Approving refunds the payment and, depending on your finance rules, removes course access." />
      {list.isLoading ? <Loading /> : (
        <>
          <Section title={`Waiting for a decision (${pending.length})`}>
            {pending.length === 0 ? <EmptyState title="No pending requests" /> : (
              <TableCard head={["Requested by", "Course", "Amount", "Reason", "Decision"]}>
                {pending.map((r) => (
                  <tr key={r.id}>
                    <td><p className="font-semibold">{r.requester?.full_name}</p><p className="text-xs text-muted-foreground">{ago(r.created_at)}</p></td>
                    <td>{r.payments?.courses?.title ?? "—"}</td>
                    <td>{moneyExact(r.payments?.amount, r.payments?.currency)}</td>
                    <td className="max-w-64">{r.reason}</td>
                    <td><div className="flex flex-wrap gap-2">
                      <Input className="h-8 w-44" placeholder="Note" value={notes[r.id] ?? ""} onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })} />
                      <Button size="sm" onClick={() => decide(r.id, true)}>Refund</Button>
                      <Button size="sm" variant="outline" onClick={() => decide(r.id, false)}>Decline</Button>
                    </div></td>
                  </tr>
                ))}
              </TableCard>
            )}
          </Section>
          <Section title="History">
            {done.length === 0 ? <EmptyState title="Nothing decided yet" /> : (
              <TableCard head={["Requested by", "Course", "Status", "Note"]}>
                {done.map((r) => <tr key={r.id}><td>{r.requester?.full_name}</td><td>{r.payments?.courses?.title}</td><td><StatusPill status={r.status} /></td><td className="text-muted-foreground">{r.decision_note ?? "—"}</td></tr>)}
              </TableCard>
            )}
          </Section>
        </>
      )}
    </div>
  );
}
