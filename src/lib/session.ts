import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Role = Database["public"]["Enums"]["app_role"];
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export const ROLE_LABEL: Record<Role, string> = {
  platform_admin: "Platform Admin",
  finance_admin: "Finance Admin",
  instructor: "Instructor",
  student: "Student",
  parent: "Parent / Guardian",
};

export const ROLE_HOME: Record<Role, "/admin" | "/finance" | "/teach" | "/family" | "/learn"> = {
  platform_admin: "/admin",
  finance_admin: "/finance",
  instructor: "/teach",
  parent: "/family",
  student: "/learn",
};

const ROLE_PRIORITY: Role[] = ["platform_admin", "finance_admin", "instructor", "parent", "student"];

export function primaryRole(roles: Role[]): Role | null {
  return ROLE_PRIORITY.find((r) => roles.includes(r)) ?? null;
}

export type Me = {
  id: string;
  email: string | null;
  profile: Tables<"profiles"> | null;
  roles: Role[];
};

export const meQuery = queryOptions({
  queryKey: ["me"],
  queryFn: async (): Promise<Me | null> => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    const [profileRes, rolesRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", user.id),
    ]);
    return {
      id: user.id,
      email: user.email ?? null,
      profile: profileRes.data ?? null,
      roles: (rolesRes.data ?? []).map((r) => r.role),
    };
  },
  staleTime: 30_000,
});

/** Use inside the signed-in area (the layout preloads this). */
export function useMe(): Me {
  const { data } = useSuspenseQuery(meQuery);
  if (!data) throw new Error("Not signed in");
  return data;
}

export function hasAnyRole(me: Me, roles: Role[]) {
  return roles.some((r) => me.roles.includes(r));
}

export function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}
