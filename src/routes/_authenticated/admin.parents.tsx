import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { unwrap } from "@/lib/session";
import { act } from "@/lib/actions";
import { ago } from "@/lib/format";
import { EmptyState, Loading, PageHeader, Section, StatusPill } from "@/components/ui-kit";
import { RoleGate, TableCard } from "@/components/admin-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/admin/parents")({
  head: () => ({ meta: [{ title: "Family links — Brightpath" }] }),
  component: () => (
    <RoleGate roles={["platform_admin"]}>
      <ParentLinks />
    </RoleGate>
  ),
});

function ParentLinks() {
  const qc = useQueryClient();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const links = useQuery({
    queryKey: ["admin-parent-links"],
    queryFn: async () =>
      unwrap(
        await supabase
          .from("parent_links")
          .select(
            "*, parent:profiles!parent_links_parent_id_fkey(full_name, email), student:profiles!parent_links_student_id_fkey(full_name, email)",
          )
          .order("created_at", { ascending: false }),
      ),
  });

  async function decide(id: string, approve: boolean) {
    const note = notes[id]?.trim() || undefined;
    if (!approve && !note) return void toast.error("Add a short reason before declining");
    const ok = await act(
      supabase.rpc(
        "verify_parent_link",
        note
          ? { _link_id: id, _approve: approve, _note: note }
          : { _link_id: id, _approve: approve },
      ),
      approve ? "Link verified" : "Link declined",
    );
    if (ok) {
      await qc.invalidateQueries({ queryKey: ["admin-parent-links"] });
      await qc.invalidateQueries({ queryKey: ["admin-overview"] });
    }
  }

  const all = links.data ?? [];
  const pending = all.filter((l) => l.status === "pending");
  const decided = all.filter((l) => l.status !== "pending");

  return (
    <div>
      <PageHeader
        eyebrow="Platform admin"
        title="Family links"
        description="A parent can only see a child's data after you verify the link. Check that the parent really is the child's guardian before approving."
      />
      {links.isLoading ? (
        <Loading />
      ) : (
        <>
          <Section title={`Waiting for verification (${pending.length})`}>
            {pending.length === 0 ? (
              <EmptyState title="No pending requests" />
            ) : (
              <TableCard
                head={["Parent", "Child's email", "Relationship", "Requested", "Decision"]}
              >
                {pending.map((l) => (
                  <tr key={l.id}>
                    <td>
                      <p className="font-semibold">{l.parent?.full_name}</p>
                      <p className="text-xs text-muted-foreground">{l.parent?.email}</p>
                    </td>
                    <td>{l.student_email}</td>
                    <td className="capitalize">{l.relationship}</td>
                    <td className="whitespace-nowrap">{ago(l.created_at)}</td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        <Input
                          className="h-8 w-48"
                          placeholder="Note (required to decline)"
                          value={notes[l.id] ?? ""}
                          onChange={(e) => setNotes({ ...notes, [l.id]: e.target.value })}
                        />
                        <Button size="sm" onClick={() => decide(l.id, true)}>
                          Verify
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => decide(l.id, false)}>
                          Decline
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </TableCard>
            )}
          </Section>
          <Section title="History">
            {decided.length === 0 ? (
              <EmptyState title="Nothing decided yet" />
            ) : (
              <TableCard head={["Parent", "Child", "Status", "Note"]}>
                {decided.map((l) => (
                  <tr key={l.id}>
                    <td>{l.parent?.full_name}</td>
                    <td>{l.student?.full_name ?? l.student_email}</td>
                    <td>
                      <StatusPill status={l.status} />
                    </td>
                    <td className="text-muted-foreground">{l.note ?? "—"}</td>
                  </tr>
                ))}
              </TableCard>
            )}
          </Section>
        </>
      )}
    </div>
  );
}
