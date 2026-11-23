import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { unwrap } from "@/lib/session";
import { dateTime, downloadCsv } from "@/lib/format";
import { EmptyState, Loading, PageHeader, Pill } from "@/components/ui-kit";
import { RoleGate, TableCard } from "@/components/admin-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/admin/audit")({
  head: () => ({ meta: [{ title: "Audit log — Brightpath" }, { name: "description", content: "History of important changes." }] }),
  component: () => (
    <RoleGate roles={["platform_admin", "finance_admin"]}>
      <Audit />
    </RoleGate>
  ),
});

function Audit() {
  const [q, setQ] = useState("");
  const log = useQuery({
    queryKey: ["audit"],
    queryFn: async () => unwrap(await supabase.from("audit_log").select("*, actor:profiles!audit_log_actor_id_fkey(full_name)").order("created_at", { ascending: false }).limit(500)),
  });
  const rows = (log.data ?? []).filter((r) => !q || `${r.action} ${r.entity} ${r.category} ${r.actor?.full_name ?? ""}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <PageHeader eyebrow="Records" title="Audit log" description="Who changed what, and when. Entries can't be edited or deleted."
        actions={<Button variant="outline" onClick={() => downloadCsv("audit-log", rows.map((r) => ({ when: r.created_at, who: r.actor?.full_name ?? "system", category: r.category, action: r.action, entity: r.entity, id: r.entity_id })))}>Export CSV</Button>} />
      <Input className="mb-4 max-w-sm" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} />
      {log.isLoading ? <Loading /> : rows.length === 0 ? <EmptyState title="No entries" /> : (
        <TableCard head={["When", "Who", "Type", "Action", "Item"]}>
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="whitespace-nowrap">{dateTime(r.created_at)}</td>
              <td>{r.actor?.full_name ?? "System"}</td>
              <td><Pill tone={r.category === "financial" ? "sun" : "neutral"}>{r.category}</Pill></td>
              <td>{r.action}</td>
              <td className="text-muted-foreground">{r.entity}</td>
            </tr>
          ))}
        </TableCard>
      )}
    </div>
  );
}
