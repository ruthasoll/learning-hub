import { queryOptions } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { unwrap } from "@/lib/session";

/** Run a database call, show a toast on error/success, return true when it worked. */
export async function act(
  p: PromiseLike<{ error: { message: string } | null }>,
  success?: string,
): Promise<boolean> {
  const { error } = await p;
  if (error) {
    toast.error(error.message);
    return false;
  }
  if (success) toast.success(success);
  return true;
}

/** Verified children linked to the signed-in parent. */
export function myChildrenQuery(parentId: string) {
  return queryOptions({
    queryKey: ["my-children", parentId],
    queryFn: async () => {
      const rows = unwrap(
        await supabase
          .from("parent_links")
          .select("id, student_id, relationship, student:profiles!parent_links_student_id_fkey(id, full_name, email, grade_level_id)")
          .eq("parent_id", parentId)
          .eq("status", "verified"),
      );
      return rows
        .filter((r) => r.student)
        .map((r) => ({ linkId: r.id, relationship: r.relationship, ...r.student! }));
    },
  });
}

export const gradeLevelsQuery = queryOptions({
  queryKey: ["grade_levels"],
  queryFn: async () => unwrap(await supabase.from("grade_levels").select("*").order("sort_order")),
  staleTime: 5 * 60_000,
});

export const periodsQuery = queryOptions({
  queryKey: ["periods"],
  queryFn: async () => unwrap(await supabase.from("academic_periods").select("*").order("starts_on")),
});

/** Every account holding the instructor role (visible to all signed-in users). */
export const instructorsQuery = queryOptions({
  queryKey: ["instructors"],
  queryFn: async () => {
    const roles = unwrap(await supabase.from("user_roles").select("user_id").eq("role", "instructor"));
    const ids = roles.map((r) => r.user_id);
    if (ids.length === 0) return [];
    return unwrap(await supabase.from("profiles").select("id, full_name, email").in("id", ids).order("full_name"));
  },
});

/** Turn a YouTube/Vimeo watch link into an embeddable URL; returns null for other links. */
export function embedUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) {
      if (u.pathname.startsWith("/embed/")) return url;
      const v = u.searchParams.get("v");
      return v ? `https://www.youtube.com/embed/${v}` : null;
    }
    if (u.hostname === "youtu.be") return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
    if (u.hostname.includes("vimeo.com")) {
      const id = u.pathname.split("/").filter(Boolean).pop();
      return id ? `https://player.vimeo.com/video/${id}` : null;
    }
  } catch {
    return null;
  }
  return null;
}

export function scorePct(total: number | null | undefined, max: number | null | undefined) {
  if (total == null || !max) return null;
  return Math.round((Number(total) / Number(max)) * 100);
}
