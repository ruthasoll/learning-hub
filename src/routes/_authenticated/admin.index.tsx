import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { HeartHandshake, ShieldCheck, UserCheck, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, StatCard } from "@/components/ui-kit";
import { RoleGate } from "@/components/admin-kit";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "Platform admin — Brightpath" }] }),
  component: () => (
    <RoleGate roles={["platform_admin"]}>
      <AdminOverview />
    </RoleGate>
  ),
});

async function count(q: PromiseLike<{ count: number | null; error: { message: string } | null }>) {
  const { count: n, error } = await q;
  if (error) throw new Error(error.message);
  return n ?? 0;
}

function AdminOverview() {
  const stats = useQuery({
    queryKey: ["admin-overview"],
    queryFn: async () => {
      const head = { count: "exact", head: true } as const;
      const [reviews, links, instructors, users] = await Promise.all([
        count(supabase.from("courses").select("id", head).in("status", ["pending", "approved"])),
        count(supabase.from("parent_links").select("id", head).eq("status", "pending")),
        count(supabase.from("profiles").select("id", head).eq("requested_role", "instructor")),
        count(supabase.from("profiles").select("id", head)),
      ]);
      return { reviews, links, instructors, users };
    },
  });
  const s = stats.data;
  return (
    <div>
      <PageHeader
        eyebrow="Platform admin"
        title="Overview"
        description="Things waiting for your attention."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link to="/admin/reviews">
          <StatCard
            label="Courses to review or publish"
            value={s?.reviews ?? "…"}
            tone="sun"
            icon={<ShieldCheck className="size-5" />}
          />
        </Link>
        <Link to="/admin/parents">
          <StatCard
            label="Family link requests"
            value={s?.links ?? "…"}
            tone="teal"
            icon={<HeartHandshake className="size-5" />}
          />
        </Link>
        <Link to="/admin/users">
          <StatCard
            label="Instructor requests"
            value={s?.instructors ?? "…"}
            tone="coral"
            icon={<UserCheck className="size-5" />}
          />
        </Link>
        <Link to="/admin/users">
          <StatCard
            label="Total users"
            value={s?.users ?? "…"}
            icon={<Users className="size-5" />}
          />
        </Link>
      </div>
    </div>
  );
}
