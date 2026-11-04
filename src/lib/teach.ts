import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { unwrap, type Tables } from "@/lib/session";

export function teachCourseQuery(courseId: string) {
  return queryOptions({
    queryKey: ["teach-course", courseId],
    queryFn: async () => {
      const res = await supabase
        .from("courses")
        .select("*, subjects(name), grade_levels(name)")
        .eq("id", courseId)
        .maybeSingle();
      if (res.error) throw new Error(res.error.message);
      return res.data as
        | (Tables<"courses"> & { subjects: { name: string } | null; grade_levels: { name: string } | null })
        | null;
    },
  });
}

export function courseOutlineQuery(courseId: string) {
  return queryOptions({
    queryKey: ["teach-outline", courseId],
    queryFn: async () => {
      const [modules, lessons] = await Promise.all([
        supabase.from("modules").select("*").eq("course_id", courseId).order("position"),
        supabase.from("lessons").select("*").eq("course_id", courseId).order("position"),
      ]);
      return { modules: unwrap(modules), lessons: unwrap(lessons) };
    },
  });
}

export function courseAssessmentsQuery(courseId: string) {
  return queryOptions({
    queryKey: ["teach-assessments", courseId],
    queryFn: async () => {
      const [a, q, k] = await Promise.all([
        supabase.from("assessments").select("*").eq("course_id", courseId).order("created_at"),
        supabase.from("questions").select("*").eq("course_id", courseId).order("position"),
        supabase.from("question_keys").select("*").eq("course_id", courseId),
      ]);
      return { assessments: unwrap(a), questions: unwrap(q), keys: unwrap(k) };
    },
  });
}

export function courseRosterQuery(courseId: string) {
  return queryOptions({
    queryKey: ["teach-roster", courseId],
    queryFn: async () => {
      const [enr, prog, subs, lessons] = await Promise.all([
        supabase
          .from("enrollments")
          .select("id, status, source, created_at, student_id, student:profiles!enrollments_student_id_fkey(id, full_name, email)")
          .eq("course_id", courseId)
          .order("created_at"),
        supabase.from("lesson_progress").select("student_id, lesson_id").eq("course_id", courseId),
        supabase.from("submissions").select("student_id, total_score, max_score, status, flagged").eq("course_id", courseId),
        supabase.from("lessons").select("id", { count: "exact", head: true }).eq("course_id", courseId),
      ]);
      return { enrollments: unwrap(enr), progress: unwrap(prog), submissions: unwrap(subs), lessonCount: lessons.count ?? 0 };
    },
  });
}

export const COURSE_STATUS_HELP: Record<string, string> = {
  draft: "Only you can see this course. Submit it when it's ready for review.",
  pending: "A platform administrator is reviewing this course.",
  approved: "Approved — an administrator will publish it to the catalog.",
  rejected: "Changes were requested. Edit the course and submit it again.",
  published: "Live in the catalog. Changes you make are visible to enrolled students.",
};
