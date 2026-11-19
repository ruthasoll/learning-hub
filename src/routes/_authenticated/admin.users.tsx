import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ROLE_LABEL, useMe, unwrap, type Role } from "@/lib/session";
import { act } from "@/lib/actions";
import { dateShort } from "@/lib/format";
import { EmptyState, Loading, PageHeader, Pill } from "@/components/ui-kit";
import { RoleGate, TableCard } from "@/components/admin-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({ meta: [{ title: "Users & roles — Brightpath" }] }),
  component: () => (
    <RoleGate roles={["platform_admin"]}>
      <UsersPage />
    </RoleGate>
  ),
});

const ALL_ROLES = Object.keys(ROLE_LABEL) as Role[];

function UsersPage() {
  const me = useMe();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");

  const users = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const [profiles, roles] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      const byUser = new Map<string, Role[]>();
      for (const r of unwrap(roles))
        byUser.set(r.user_id, [...(byUser.get(r.user_id) ?? []), r.role]);
      return unwrap(profiles).map((p) => ({ ...p, roles: byUser.get(p.id) ?? [] }));
    },
  });

  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ["admin-users"] });
    await qc.invalidateQueries({ queryKey: ["admin-overview"] });
  };

  async function grant(userId: string, role: Role) {
    const ok = await act(
      supabase.from("user_roles").insert({ user_id: userId, role }),
      `${ROLE_LABEL[role]} role granted`,
    );
    if (!ok) return;
    // An approved instructor request is no longer pending.
    if (role === "instructor")
      await supabase.from("profiles").update({ requested_role: null }).eq("id", userId);
    await refresh();
  }
  async function revoke(userId: string, role: Role) {
    if (userId === me.id && role === "platform_admin") return;
    if (!window.confirm(`Remove the ${ROLE_LABEL[role]} role from this user?`)) return;
    if (
      await act(
        supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role),
        "Role removed",
      )
    )
      await refresh();
  }
  async function declineRequest(userId: string) {
    if (
      await act(
        supabase.from("profiles").update({ requested_role: null }).eq("id", userId),
        "Request declined",
      )
    )
      await refresh();
  }
  async function setActive(userId: string, active: boolean) {
    if (!active && !window.confirm("Deactivate this account?")) return;
    if (
      await act(
        supabase.from("profiles").update({ is_active: active }).eq("id", userId),
        active ? "Account reactivated" : "Account deactivated",
      )
    )
      await refresh();
  }

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (users.data ?? []).filter((u) => {
      if (filter === "requests" && u.requested_role !== "instructor") return false;
      if (filter !== "all" && filter !== "requests" && !u.roles.includes(filter as Role))
        return false;
      return (
        !q || u.full_name.toLowerCase().includes(q) || (u.email ?? "").toLowerCase().includes(q)
      );
    });
  }, [users.data, search, filter]);

  return (
    <div>
      <PageHeader
        eyebrow="Platform admin"
        title="Users & roles"
        description="Approve instructors, assign roles and deactivate accounts."
      />
      <div className="mb-4 flex flex-wrap gap-3">
        <Input
          className="max-w-xs"
          placeholder="Search name or email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All users</SelectItem>
            <SelectItem value="requests">Instructor requests</SelectItem>
            {ALL_ROLES.map((r) => (
              <SelectItem key={r} value={r}>
                {ROLE_LABEL[r]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {users.isLoading ? (
        <Loading />
      ) : list.length === 0 ? (
        <EmptyState title="No users match" />
      ) : (
        <TableCard head={["User", "Roles", "Joined", "Status", "Actions"]}>
          {list.map((u) => {
            const missing = ALL_ROLES.filter((r) => !u.roles.includes(r));
            const isMe = u.id === me.id;
            return (
              <tr key={u.id}>
                <td>
                  <p className="font-semibold">
                    {u.full_name || "—"}
                    {isMe && " (you)"}
                  </p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </td>
                <td>
                  <div className="flex flex-wrap gap-1.5">
                    {u.roles.length === 0 && (
                      <span className="text-xs text-muted-foreground">No role yet</span>
                    )}
                    {u.roles.map((r) => (
                      <span key={r} className="inline-flex items-center gap-1">
                        <Pill tone="teal">{ROLE_LABEL[r]}</Pill>
                        {!(isMe && r === "platform_admin") && (
                          <button
                            className="text-xs text-coral underline"
                            onClick={() => revoke(u.id, r)}
                            aria-label={`Remove ${ROLE_LABEL[r]}`}
                          >
                            remove
                          </button>
                        )}
                      </span>
                    ))}
                    {u.requested_role === "instructor" && (
                      <Pill tone="sun">Requested instructor</Pill>
                    )}
                  </div>
                </td>
                <td className="whitespace-nowrap">{dateShort(u.created_at)}</td>
                <td>
                  {u.is_active ? (
                    <Pill tone="teal">Active</Pill>
                  ) : (
                    <Pill tone="coral">Deactivated</Pill>
                  )}
                </td>
                <td>
                  <div className="flex flex-wrap items-center gap-2">
                    {u.requested_role === "instructor" && (
                      <>
                        <Button size="sm" onClick={() => grant(u.id, "instructor")}>
                          Approve instructor
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => declineRequest(u.id)}>
                          Decline
                        </Button>
                      </>
                    )}
                    {missing.length > 0 && (
                      <Select onValueChange={(v) => grant(u.id, v as Role)} value="">
                        <SelectTrigger className="h-8 w-36">
                          <SelectValue placeholder="Add role…" />
                        </SelectTrigger>
                        <SelectContent>
                          {missing.map((r) => (
                            <SelectItem key={r} value={r}>
                              {ROLE_LABEL[r]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {!isMe && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setActive(u.id, !u.is_active)}
                      >
                        {u.is_active ? "Deactivate" : "Reactivate"}
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </TableCard>
      )}
    </div>
  );
}
