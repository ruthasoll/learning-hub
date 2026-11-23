import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { unwrap, useMe } from "@/lib/session";
import { act } from "@/lib/actions";
import { dateTime, downloadCsv, moneyExact } from "@/lib/format";
import { EmptyState, Loading, PageHeader, StatusPill } from "@/components/ui-kit";
import { RoleGate, TableCard } from "@/components/admin-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/finance/transactions")({
  head: () => ({ meta: [{ title: "Transactions — Brightpath" }, { name: "description", content: "Every payment, with reconciliation." }] }),
  component: () => (
    <RoleGate roles={["finance_admin", "platform_admin"]}>
      <Transactions />
    </RoleGate>
  ),
});

function Transactions() {
  const me = useMe();
  const canEdit = me.roles.includes("finance_admin");
  const qc = useQueryClient();
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const list = useQuery({
    queryKey: ["fin-tx"],
    queryFn: async () => unwrap(await supabase.from("payments").select("*, courses(title), price_plans(name), payer:profiles!payments_payer_id_fkey(full_name, email), student:profiles!payments_student_id_fkey(full_name)").order("created_at", { ascending: false }).limit(500)),
  });
  const rows = (list.data ?? []).filter((p) => (status === "all" || p.status === status) && (!q || `${p.payer?.full_name} ${p.payer?.email} ${p.courses?.title} ${p.provider_ref}`.toLowerCase().includes(q.toLowerCase())));

  async function reconcile(id: string) {
    const ref = window.prompt("Settlement reference (from the bank or provider)");
    if (ref === null) return;
    if (await act(supabase.from("payments").update({ reconciled_at: new Date().toISOString(), settlement_ref: ref || null }).eq("id", id), "Marked reconciled")) await qc.invalidateQueries({ queryKey: ["fin-tx"] });
  }

  return (
    <div>
      <PageHeader eyebrow="Finance" title="Transactions" description="Search payments and mark them reconciled against your bank settlements."
        actions={<Button variant="outline" onClick={() => downloadCsv("transactions", rows.map((p) => ({ date: p.created_at, payer: p.payer?.full_name, student: p.student?.full_name, item: p.courses?.title ?? p.price_plans?.name, subtotal: p.subtotal, discount: p.discount, amount: p.amount, coupon: p.coupon_code, status: p.status, reference: p.provider_ref, reconciled: p.reconciled_at, settlement: p.settlement_ref })))}>Export CSV</Button>} />
      <div className="mb-4 flex flex-wrap gap-2">
        <Input className="max-w-xs" placeholder="Search payer, course, reference" value={q} onChange={(e) => setQ(e.target.value)} />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>{["all", "succeeded", "pending", "failed", "refunded", "disputed"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      {list.isLoading ? <Loading /> : rows.length === 0 ? <EmptyState title="No payments match" /> : (
        <TableCard head={["Date", "Payer", "Item", "Amount", "Status", "Reconciled"]}>
          {rows.map((p) => (
            <tr key={p.id}>
              <td className="whitespace-nowrap">{dateTime(p.created_at)}</td>
              <td><p className="font-semibold">{p.payer?.full_name}</p>{p.student && p.student.full_name !== p.payer?.full_name && <p className="text-xs text-muted-foreground">for {p.student.full_name}</p>}</td>
              <td>{p.courses?.title ?? p.price_plans?.name}{p.coupon_code && <p className="text-xs text-muted-foreground">code {p.coupon_code}</p>}</td>
              <td>{moneyExact(p.amount, p.currency)}</td>
              <td><StatusPill status={p.status} /></td>
              <td>{p.reconciled_at ? <span className="text-xs">✓ {p.settlement_ref ?? ""}</span> : canEdit && p.status === "succeeded" ? <Button size="sm" variant="outline" onClick={() => reconcile(p.id)}>Reconcile</Button> : "—"}</td>
            </tr>
          ))}
        </TableCard>
      )}
    </div>
  );
}
