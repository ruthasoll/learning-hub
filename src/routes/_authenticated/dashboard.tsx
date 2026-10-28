import { createFileRoute, Navigate } from "@tanstack/react-router";
import { primaryRole, ROLE_HOME, useMe } from "@/lib/session";
import { Loading } from "@/components/ui-kit";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Brightpath" }] }),
  component: Dashboard,
});

function Dashboard() {
  const me = useMe();
  const role = primaryRole(me.roles);
  if (!role) return <Loading label="Setting up your account…" />;
  return <Navigate to={ROLE_HOME[role]} replace />;
}
