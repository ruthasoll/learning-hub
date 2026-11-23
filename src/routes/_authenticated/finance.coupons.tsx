import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { unwrap } from "@/lib/session";
import { act } from "@/lib/actions";
import { dateShort, moneyExact } from "@/lib/format";
import { EmptyState, Loading, PageHeader, Section } from "@/components/ui-kit";
import { Field, RoleGate, TableCard } from "@/components/admin-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/_authenticated/finance/coupons")({
  head: () => ({ meta: [{ title: "Discount codes — Brightpath" }, { name: "description", content: "Create and manage discount codes." }] }),
  component: () => (
    <RoleGate roles={["finance_admin"]}>
      <Coupons />
    </RoleGate>
  ),
});

const blank = { code: "", description: "", percent: "", amount: "", expires: "", max: "" };

function Coupons() {
  const qc = useQueryClient();
  const [f, setF] = useState(blank);
  const list = useQuery({ queryKey: ["coupons"], queryFn: async () => unwrap(await supabase.from("coupons").select("*").order("created_at", { ascending: false })) });
  const inv = () => qc.invalidateQueries({ queryKey: ["coupons"] });

  async function add() {
    if (!f.code.trim()) return void toast.error("Enter a code");
    if (!!f.percent === !!f.amount) return void toast.error("Set either a percent or a fixed amount");
    const ok = await act(supabase.from("coupons").insert({
      code: f.code.trim().toUpperCase(), description: f.description,
      percent_off: f.percent ? Number(f.percent) : null, amount_off: f.amount ? Number(f.amount) : null,
      expires_at: f.expires ? new Date(f.expires).toISOString() : null, max_redemptions: f.max ? Number(f.max) : null,
    }), "Code created");
    if (ok) { setF(blank); await inv(); }
  }

  return (
    <div>
      <PageHeader eyebrow="Finance" title="Discount codes" description="Codes families can enter at checkout." />
      <Section title="New code">
        <div className="pop-card grid gap-4 p-5 md:grid-cols-3">
          <Field label="Code"><Input value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} /></Field>
          <Field label="Percent off"><Input type="number" value={f.percent} onChange={(e) => setF({ ...f, percent: e.target.value })} /></Field>
          <Field label="Or fixed amount off"><Input type="number" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></Field>
          <Field label="Description"><Input value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
          <Field label="Expires"><Input type="date" value={f.expires} onChange={(e) => setF({ ...f, expires: e.target.value })} /></Field>
          <Field label="Max uses"><Input type="number" value={f.max} onChange={(e) => setF({ ...f, max: e.target.value })} /></Field>
          <div><Button onClick={add}>Create code</Button></div>
        </div>
      </Section>
      <Section title="All codes">
        {list.isLoading ? <Loading /> : (list.data ?? []).length === 0 ? <EmptyState title="No codes yet" /> : (
          <TableCard head={["Code", "Discount", "Used", "Expires", "Active", ""]}>
            {(list.data ?? []).map((c) => (
              <tr key={c.id}>
                <td><p className="font-mono font-bold">{c.code}</p><p className="text-xs text-muted-foreground">{c.description}</p></td>
                <td>{c.percent_off ? `${Number(c.percent_off)}%` : moneyExact(c.amount_off)}</td>
                <td>{c.times_redeemed}{c.max_redemptions ? ` / ${c.max_redemptions}` : ""}</td>
                <td>{dateShort(c.expires_at)}</td>
                <td><Switch checked={c.active} onCheckedChange={async (v) => (await act(supabase.from("coupons").update({ active: v }).eq("id", c.id))) && inv()} /></td>
                <td><Button size="sm" variant="ghost" onClick={async () => window.confirm("Delete this code?") && (await act(supabase.from("coupons").delete().eq("id", c.id), "Deleted")) && inv()}>Delete</Button></td>
              </tr>
            ))}
          </TableCard>
        )}
      </Section>
    </div>
  );
}
