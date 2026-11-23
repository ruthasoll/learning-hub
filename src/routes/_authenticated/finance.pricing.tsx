import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { unwrap } from "@/lib/session";
import { act } from "@/lib/actions";
import { moneyExact } from "@/lib/format";
import { EmptyState, Loading, PageHeader, Pill, Section } from "@/components/ui-kit";
import { Field, RoleGate, TableCard } from "@/components/admin-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/finance/pricing")({
  head: () => ({ meta: [{ title: "Pricing — Brightpath" }, { name: "description", content: "Course prices, bundles and subscriptions." }] }),
  component: () => (
    <RoleGate roles={["finance_admin"]}>
      <Pricing />
    </RoleGate>
  ),
});

function Pricing() {
  const qc = useQueryClient();
  const courses = useQuery({ queryKey: ["fin-courses"], queryFn: async () => unwrap(await supabase.from("courses").select("id, title, price, currency, status").order("title")) });
  const plans = useQuery({ queryKey: ["fin-plans"], queryFn: async () => unwrap(await supabase.from("price_plans").select("*").order("created_at", { ascending: false })) });
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [p, setP] = useState({ name: "", kind: "bundle", amount: "", interval: "month", description: "", ids: [] as string[] });

  async function savePrice(id: string) {
    const v = Number(prices[id]);
    if (Number.isNaN(v) || v < 0) return void toast.error("Enter a valid price");
    if (await act(supabase.from("courses").update({ price: v }).eq("id", id), "Price updated")) await qc.invalidateQueries({ queryKey: ["fin-courses"] });
  }
  async function addPlan() {
    if (!p.name.trim() || !p.amount) return void toast.error("Name and price are required");
    const ok = await act(supabase.from("price_plans").insert({
      name: p.name.trim(), kind: p.kind, amount: Number(p.amount), description: p.description, course_ids: p.ids,
      billing_interval: p.kind === "subscription" ? p.interval : null,
    }), "Plan created");
    if (ok) { setP({ ...p, name: "", amount: "", description: "", ids: [] }); await qc.invalidateQueries({ queryKey: ["fin-plans"] }); }
  }

  if (courses.isLoading) return <Loading />;
  return (
    <div>
      <PageHeader eyebrow="Finance" title="Pricing" description="Set course prices and create bundles or subscriptions. Set 0 for a free course." />
      <Section title="Course prices">
        <TableCard head={["Course", "Status", "Price", ""]}>
          {(courses.data ?? []).map((c) => (
            <tr key={c.id}>
              <td className="font-semibold">{c.title}</td>
              <td><Pill>{c.status}</Pill></td>
              <td><Input type="number" min={0} step="0.01" className="h-8 w-28" value={prices[c.id] ?? String(c.price)} onChange={(e) => setPrices({ ...prices, [c.id]: e.target.value })} /></td>
              <td>{prices[c.id] !== undefined && prices[c.id] !== String(c.price) && <Button size="sm" onClick={() => savePrice(c.id)}>Save</Button>}</td>
            </tr>
          ))}
        </TableCard>
      </Section>
      <Section title="Bundles & subscriptions">
        <div className="pop-card mb-4 grid gap-4 p-5 md:grid-cols-3">
          <Field label="Name"><Input value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} /></Field>
          <Field label="Type">
            <Select value={p.kind} onValueChange={(v) => setP({ ...p, kind: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="bundle">Bundle (one payment)</SelectItem><SelectItem value="subscription">Subscription</SelectItem></SelectContent>
            </Select>
          </Field>
          <Field label={p.kind === "subscription" ? `Price per ${p.interval}` : "Price"}><Input type="number" value={p.amount} onChange={(e) => setP({ ...p, amount: e.target.value })} /></Field>
          {p.kind === "subscription" && (
            <Field label="Billed every">
              <Select value={p.interval} onValueChange={(v) => setP({ ...p, interval: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="month">Month</SelectItem><SelectItem value="term">Term</SelectItem><SelectItem value="year">Year</SelectItem></SelectContent>
              </Select>
            </Field>
          )}
          <Field label="Description"><Input value={p.description} onChange={(e) => setP({ ...p, description: e.target.value })} /></Field>
          <div className="md:col-span-3">
            <p className="mb-2 text-sm font-semibold">Included courses</p>
            <div className="grid gap-1 md:grid-cols-3">
              {(courses.data ?? []).map((c) => (
                <label key={c.id} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={p.ids.includes(c.id)} onCheckedChange={(v) => setP({ ...p, ids: v ? [...p.ids, c.id] : p.ids.filter((x) => x !== c.id) })} /> {c.title}
                </label>
              ))}
            </div>
          </div>
          <div><Button onClick={addPlan}>Create plan</Button></div>
        </div>
        {(plans.data ?? []).length === 0 ? <EmptyState title="No plans yet" /> : (
          <TableCard head={["Plan", "Type", "Price", "Courses", "Active"]}>
            {(plans.data ?? []).map((x) => (
              <tr key={x.id}>
                <td><p className="font-semibold">{x.name}</p><p className="text-xs text-muted-foreground">{x.description}</p></td>
                <td>{x.kind}{x.billing_interval ? ` / ${x.billing_interval}` : ""}</td>
                <td>{moneyExact(x.amount, x.currency)}</td>
                <td>{x.course_ids.length}</td>
                <td><Switch checked={x.active} onCheckedChange={async (v) => (await act(supabase.from("price_plans").update({ active: v }).eq("id", x.id))) && qc.invalidateQueries({ queryKey: ["fin-plans"] })} /></td>
              </tr>
            ))}
          </TableCard>
        )}
      </Section>
    </div>
  );
}
