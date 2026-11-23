import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { unwrap } from "@/lib/session";
import { moneyExact, downloadCsv } from "@/lib/format";
import { Loading, PageHeader, Section, StatCard } from "@/components/ui-kit";
import { RoleGate, TableCard } from "@/components/admin-kit";
import { SettingsEditor } from "@/components/settings-editor";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/finance/")({
  head: () => ({ meta: [{ title: "Finance overview — Brightpath" }, { name: "description", content: "Revenue, refunds and payment health." }] }),
  component: () => (
    <RoleGate roles={["finance_admin", "platform_admin"]}>
      <Overview />
    </RoleGate>
  ),
});

function Overview() {
  const data = useQuery({
    queryKey: ["finance-overview"],
    queryFn: async () => {
      const pays = unwrap(await supabase.from("payments").select("amount, discount, status, course_id, created_at, courses(title)"));
      const pendingRefunds = (await supabase.from("refund_requests").select("id", { count: "exact", head: true }).eq("status", "pending")).count ?? 0;
      return { pays, pendingRefunds };
    },
  });
  if (data.isLoading || !data.data) return <Loading />;
  const { pays, pendingRefunds } = data.data;
  const sum = (st: string) => pays.filter((p) => p.status === st).reduce((n, p) => n + Number(p.amount), 0);
  const byCourse = new Map<string, { title: string; revenue: number; count: number }>();
  for (const p of pays.filter((x) => x.status === "succeeded")) {
    const k = p.course_id ?? "plan";
    const e = byCourse.get(k) ?? { title: p.courses?.title ?? "Bundles & plans", revenue: 0, count: 0 };
    e.revenue += Number(p.amount); e.count += 1; byCourse.set(k, e);
  }
  const top = [...byCourse.values()].sort((a, b) => b.revenue - a.revenue);
  return (
    <div>
      <PageHeader eyebrow="Finance" title="Overview" description="Payments are in test mode until a real payment provider is connected."
        actions={<Button variant="outline" onClick={() => downloadCsv("revenue-by-course", top.map((t) => ({ course: t.title, sales: t.count, revenue: t.revenue })))}>Export report</Button>} />
      <div className="mb-8 grid gap-4 md:grid-cols-4">
        <StatCard label="Revenue" value={moneyExact(sum("succeeded"))} tone="teal" />
        <StatCard label="Refunded" value={moneyExact(sum("refunded"))} />
        <StatCard label="Failed payments" value={pays.filter((p) => p.status === "failed").length} />
        <StatCard label="Refund requests" value={pendingRefunds} hint={<Link to="/finance/refunds" className="underline">Review</Link>} tone="sun" />
      </div>
      <Section title="Revenue by course">
        <TableCard head={["Course", "Sales", "Revenue"]}>
          {top.map((t) => <tr key={t.title}><td className="font-semibold">{t.title}</td><td>{t.count}</td><td>{moneyExact(t.revenue)}</td></tr>)}
        </TableCard>
      </Section>
      <Section title="Finance rules">
        <SettingsEditor defs={[
          { key: "finance_currency", label: "Currency", type: "text" },
          { key: "finance_revoke_access_on_refund", label: "Remove course access when refunded", type: "bool" },
          { key: "finance_allow_free_enrollment", label: "Allow free courses", type: "bool" },
        ]} />
      </Section>
    </div>
  );
}
