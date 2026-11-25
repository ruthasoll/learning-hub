import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { unwrap, useMe } from "@/lib/session";
import { act } from "@/lib/actions";
import { emptyTransactionFilters, filterTransactions, transactionFilterError, type TransactionFilters } from "@/lib/finance";
import { Download, RotateCcw } from "lucide-react";
import { dateTime, downloadCsv, moneyExact } from "@/lib/format";
import { EmptyState, Loading, PageHeader, StatusPill } from "@/components/ui-kit";
import { Field, RoleGate, TableCard } from "@/components/admin-kit";
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
  const [filters, setFilters] = useState(emptyTransactionFilters);
  const update = (key: keyof TransactionFilters, value: string) => setFilters((current) => ({ ...current, [key]: value }));
  const list = useQuery({
    queryKey: ["fin-tx"],
    queryFn: async () => {
      const fetchPage = (offset: number) => supabase.from("payments").select("*, courses(title), price_plans(name), payer:profiles!payments_payer_id_fkey(full_name, email), student:profiles!payments_student_id_fkey(full_name)").order("created_at", { ascending: false }).order("id").range(offset, offset + 499);
      const payments = unwrap(await fetchPage(0));
      let lastCount = payments.length;
      while (lastCount === 500) {
        const next = unwrap(await fetchPage(payments.length));
        payments.push(...next);
        lastCount = next.length;
      }
      return payments;
    },
  });
  const all = list.data ?? [];
  const error = transactionFilterError(filters);
  const rows = filterTransactions(all, filters);
  const students = [...new Map(all.filter((p) => p.student_id).map((p) => [p.student_id, p.student?.full_name ?? "Unknown student"])).entries()];
  const courses = [...new Map(all.filter((p) => p.course_id).map((p) => [p.course_id, p.courses?.title ?? "Unknown course"])).entries()];
  const providers = [...new Set(all.map((p) => p.provider))].sort();
  const totals = [...new Set(rows.map((p) => p.currency))].map((currency) => ({
    currency,
    amount: rows.filter((p) => p.currency === currency).reduce((sum, p) => sum + Number(p.amount), 0),
    discount: rows.filter((p) => p.currency === currency).reduce((sum, p) => sum + Number(p.discount), 0),
  }));

  async function reconcile(id: string) {
    const ref = window.prompt("Settlement reference (from the bank or provider)");
    if (ref === null) return;
    if (await act(supabase.from("payments").update({ reconciled_at: new Date().toISOString(), settlement_ref: ref || null }).eq("id", id), "Marked reconciled")) await qc.invalidateQueries({ queryKey: ["fin-tx"] });
  }

  return (
    <div>
      <PageHeader eyebrow="Finance" title="Transactions" description="Payment records and settlement history."
        actions={<Button variant="outline" disabled={list.isLoading || !!error || rows.length === 0} onClick={() => downloadCsv("transactions", rows.map((p) => ({ date: p.created_at, payer: p.payer?.full_name, student: p.student?.full_name, item: p.courses?.title ?? p.price_plans?.name, provider: p.provider, currency: p.currency, subtotal: p.subtotal, discount: p.discount, amount: p.amount, coupon: p.coupon_code, status: p.status, reference: p.provider_ref, reconciled: p.reconciled_at, settlement: p.settlement_ref })))}><Download /> Export CSV</Button>} />
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Field label="Search"><Input aria-label="Search transactions" placeholder="Payer, student, item, reference" value={filters.query} onChange={(e) => update("query", e.target.value)} /></Field>
        <Field label="Status"><Select value={filters.status} onValueChange={(v) => update("status", v)}>
          <SelectTrigger aria-label="Payment status" className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>{["all", "succeeded", "pending", "failed", "refunded", "disputed"].map((s) => <SelectItem key={s} value={s}>{s === "all" ? "All statuses" : s}</SelectItem>)}</SelectContent>
        </Select></Field>
        <Field label="From date"><Input aria-label="From date" type="date" value={filters.startDate} onChange={(e) => update("startDate", e.target.value)} /></Field>
        <Field label="Through date"><Input aria-label="Through date" type="date" value={filters.endDate} onChange={(e) => update("endDate", e.target.value)} /></Field>
        <Field label="Student"><Select value={filters.studentId} onValueChange={(v) => update("studentId", v)}>
          <SelectTrigger aria-label="Student filter" className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All students</SelectItem>{students.map(([id, name]) => id && <SelectItem key={id} value={id}>{name}</SelectItem>)}</SelectContent>
        </Select></Field>
        <Field label="Course"><Select value={filters.courseId} onValueChange={(v) => update("courseId", v)}>
          <SelectTrigger aria-label="Course filter" className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All courses</SelectItem>{courses.map(([id, name]) => id && <SelectItem key={id} value={id}>{name}</SelectItem>)}</SelectContent>
        </Select></Field>
        <Field label="Provider"><Select value={filters.provider} onValueChange={(v) => update("provider", v)}>
          <SelectTrigger aria-label="Provider filter" className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All providers</SelectItem>{providers.map((provider) => <SelectItem key={provider} value={provider}>{provider}</SelectItem>)}</SelectContent>
        </Select></Field>
        <Field label="Settlement"><Select value={filters.settlement} onValueChange={(v) => update("settlement", v)}>
          <SelectTrigger aria-label="Settlement filter" className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All settlements</SelectItem><SelectItem value="reconciled">Reconciled</SelectItem><SelectItem value="unreconciled">Unreconciled</SelectItem></SelectContent>
        </Select></Field>
        <Field label="Minimum amount"><Input aria-label="Minimum amount" type="number" min="0" step="0.01" value={filters.minAmount} onChange={(e) => update("minAmount", e.target.value)} /></Field>
        <Field label="Maximum amount"><Input aria-label="Maximum amount" type="number" min="0" step="0.01" value={filters.maxAmount} onChange={(e) => update("maxAmount", e.target.value)} /></Field>
        <div className="flex items-end"><Button variant="ghost" onClick={() => setFilters(emptyTransactionFilters)}><RotateCcw /> Clear filters</Button></div>
      </div>
      {error && <p role="alert" className="mb-4 text-sm text-destructive">{error}</p>}
      <div aria-live="polite" className="mb-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
        <span>{rows.length} of {all.length} payments</span>
        {totals.map((total) => <span key={total.currency}>{total.currency}: {moneyExact(total.amount, total.currency)} total · {moneyExact(total.discount, total.currency)} discounts</span>)}
      </div>
      {list.isLoading ? <Loading /> : list.error ? <EmptyState title="Payments could not be loaded" description={list.error.message} action={<Button variant="outline" onClick={() => list.refetch()}>Try again</Button>} /> : rows.length === 0 ? <EmptyState title="No payments match" /> : (
        <TableCard head={["Date", "Payer / Student", "Item", "Provider / Reference", "Amount", "Status", "Reconciled"]}>
          {rows.map((p) => (
            <tr key={p.id}>
              <td className="whitespace-nowrap">{dateTime(p.created_at)}</td>
              <td><p className="font-semibold">{p.payer?.full_name}</p>{p.student && p.student.full_name !== p.payer?.full_name && <p className="text-xs text-muted-foreground">for {p.student.full_name}</p>}</td>
              <td>{p.courses?.title ?? p.price_plans?.name}{p.coupon_code && <p className="text-xs text-muted-foreground">code {p.coupon_code}</p>}</td>
              <td><p>{p.provider}</p><p className="text-xs text-muted-foreground">{p.provider_ref ?? "—"}</p></td>
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
