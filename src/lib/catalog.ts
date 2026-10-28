import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const catalogQuery = queryOptions({
  queryKey: ["catalog"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("courses")
      .select("id, title, summary, price, currency, delivery_mode, live_sessions_enabled, subject_id, grade_level_id, subjects(name), grade_levels(name, sort_order)")
      .eq("status", "published")
      .eq("is_visible", true)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data;
  },
});

export const subjectsQuery = queryOptions({
  queryKey: ["subjects"],
  queryFn: async () => {
    const { data, error } = await supabase.from("subjects").select("*").order("name");
    if (error) throw error;
    return data;
  },
});

export const plansQuery = queryOptions({
  queryKey: ["plans", "active"],
  queryFn: async () => {
    const { data, error } = await supabase.from("price_plans").select("*").eq("active", true).order("amount");
    if (error) throw error;
    return data;
  },
});

export const MODE_LABEL = { guided: "Teacher-guided", self_paced: "Self-paced" } as const;
