import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Printer, Receipt, Undo2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe, unwrap } from "@/lib/session";
import { act } from "@/lib/actions";
import { dateShort, dateTime, moneyExact } from "@/lib/format";
import { EmptyState, Loading, PageHeader, Pill, StatusPill } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/payments")({
  validateSearch: (s: Record<string, unknown>): { highlight?: string } =>
    typeof s["highlight"] === "string" ? { highlight: s["highlight"] } : {},
  head: () => ({ meta: [{ title: "Payments & receipts — Brightpath" }] }),
  component: PaymentsPage,
});

function PaymentsPage() {
  const me = useMe();
  const qc = useQueryClient();
  const { highlight } = Route.useSearch();
  const [receipt, setReceipt] = useState<string | null>(null);
  const [refundFor, setRefundFor] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const q = useQuery({
    queryKey: ["my-payments", me.id],
    queryFn: async () => {
      const pays = unwrap(
        await supabase
          .from("payments")
          .select("*, courses(title), price_plans(name), student:profiles!payments_student_id_fkey(full_name)")
          .or(`payer_id.eq.${me.id},student_id.eq.${me.id}`)
          .order("created_at", { ascending: false }),
      );
      const reqs = unwrap(await supabase.from("refund_requests").select("*").eq("requested_by", me.id));
      const enrolls = unwrap(await supabase.from("enrollments").select("course_id, status, student_id").eq("student_id", me.id));
      return { pays, reqs, enrolls };
    },
  });

  async function requestRefund() {
    if (!refundFor) return;
    const ok = await act(
      supabase.from("refund_requests").insert({ payment_id: refundFor, reason: reason.trim(), requested_by: me.id }),
      "Refund request sent to the finance team",
    );
    if (ok) {
      setRefundFor(null);
      setReason("");
      await qc.invalidateQueries({ queryKey: ["my-payments"] });
    }
  }

  const r = q.data?.pays.find((p) => p.id === receipt);

  return (
    <div>
      <PageHeader
        eyebrow="Payments"
        title="Purchases & receipts"
        description="Every course purchase, its receipt, and any refund requests."
        actions={<Button asChild variant="outline"><Link to="/catalog">Browse courses</Link></Button>}
      />
      {q.isLoading ? (
        <Loading />
      ) : !q.data || q.data.pays.length === 0 ? (
        <EmptyState icon={<Receipt className="size-8" />} title="No payments yet" description="Purchases you make will show up here with receipts." />
      ) : (
        <div className="pop-card-flat overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b-2 border-ink bg-muted text-left">
              <tr>
                <th className="p-3">Date</th>
                <th className="p-3">Item</th>
                <th className="p-3">For</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Status</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {q.data.pays.map((p) => {
                const req = q.data.reqs.find((x) => x.payment_id === p.id);
                return (
                  <tr key={p.id} className={highlight === p.id ? "bg-sun-soft" : "border-b last:border-0"}>
                    <td className="p-3 whitespace-nowrap">{dateShort(p.created_at)}</td>
                    <td className="p-3 font-semibold">{p.courses?.title ?? p.price_plans?.name ?? "Course"}</td>
                    <td className="p-3">{p.student?.full_name ?? "—"}</td>
                    <td className="p-3 font-bold">{moneyExact(p.amount, p.currency)}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        <StatusPill status={p.status} />
                        {req && <Pill tone={req.status === "approved" ? "teal" : req.status === "rejected" ? "coral" : "sun"}>refund {req.status}</Pill>}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="outline" onClick={() => setReceipt(p.id)}><Receipt /> Receipt</Button>
                        {p.status === "succeeded" && p.payer_id === me.id && !req && Number(p.amount) > 0 && (
                          <Button size="sm" variant="ghost" onClick={() => setRefundFor(p.id)}><Undo2 /> Request refund</Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!r} onOpenChange={(o) => !o && setReceipt(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Receipt</DialogTitle></DialogHeader>
          {r && (
            <div className="grid gap-2 text-sm" id="receipt">
              <p className="font-display text-lg font-bold">Brightpath Academy</p>
              <Row k="Receipt no." v={r.provider_ref ?? r.id.slice(0, 8)} />
              <Row k="Date" v={dateTime(r.created_at)} />
              <Row k="Item" v={r.courses?.title ?? r.price_plans?.name ?? "Course"} />
              <Row k="Student" v={r.student?.full_name ?? "—"} />
              <Row k="Subtotal" v={moneyExact(r.subtotal, r.currency)} />
              {Number(r.discount) > 0 && <Row k={`Discount${r.coupon_code ? ` (${r.coupon_code})` : ""}`} v={`−${moneyExact(r.discount, r.currency)}`} />}
              <Row k="Total paid" v={moneyExact(r.amount, r.currency)} bold />
              <Row k="Status" v={r.status} />
              <Row k="Payment method" v={r.provider === "simulated" ? "Test payment" : r.provider} />
              {r.refunded_at && <Row k="Refunded" v={dateShort(r.refunded_at)} />}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => window.print()}><Printer /> Print</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!refundFor} onOpenChange={(o) => !o && setRefundFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Request a refund</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Tell the finance team why you'd like a refund. Course access may end once a refund is issued.</p>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason" maxLength={1000} />
          <DialogFooter>
            <Button variant="hero" disabled={!reason.trim()} onClick={requestRefund}>Send request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 border-b border-dashed py-1 ${bold ? "font-bold" : ""}`}>
      <span className="text-muted-foreground">{k}</span>
      <span className="text-right capitalize">{v}</span>
    </div>
  );
}
