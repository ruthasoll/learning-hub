import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { unwrap } from "@/lib/session";

/**
 * Everything a student (or their verified parent) needs for a dashboard.
 * Row-level security decides what the signed-in viewer can actually read.
 */
export function studentOverviewQuery(studentId: string) {
  return queryOptions({
    queryKey: ["student-overview", studentId],
    queryFn: async () => {
      const enrollments = unwrap(
        await supabase
          .from("enrollments")
          .select("id, status, course_id, created_at, courses(id, title, summary, delivery_mode, live_sessions_enabled, instructor_id, grade_levels(name), subjects(name))")
          .eq("student_id", studentId)
          .eq("status", "active"),
      );
      const ids = enrollments.map((e) => e.course_id);
      if (ids.length === 0) {
        return { enrollments, courses: [], assessments: [], sessions: [], submissions: [], attendance: [], interventions: [] };
      }
      const [lessons, progress, assessments, submissions, sessions, attendance, interventions] = await Promise.all([
        supabase.from("lessons").select("id, course_id").in("course_id", ids),
        supabase.from("lesson_progress").select("lesson_id, course_id, completed_at").eq("student_id", studentId),
        supabase.from("assessments").select("id, course_id, title, kind, due_at, pass_mark").in("course_id", ids).order("due_at", { ascending: true, nullsFirst: false }),
        supabase.from("submissions").select("id, assessment_id, course_id, status, total_score, max_score, feedback, submitted_at, graded_at, flagged").eq("student_id", studentId).order("submitted_at", { ascending: false }),
        supabase.from("live_sessions").select("id, course_id, title, starts_at, duration_min, meeting_url, notes").in("course_id", ids).order("starts_at"),
        supabase.from("attendance").select("session_id, status, course_id").eq("student_id", studentId),
        supabase.from("interventions").select("id, course_id, concern, action, created_at, status").eq("student_id", studentId).order("created_at", { ascending: false }),
      ]);
      const lessonRows = unwrap(lessons);
      const progressRows = unwrap(progress);
      const subs = unwrap(submissions);
      const courses = enrollments.map((e) => {
        const total = lessonRows.filter((l) => l.course_id === e.course_id).length;
        const done = progressRows.filter((p) => p.course_id === e.course_id).length;
        const courseSubs = subs.filter((s) => s.course_id === e.course_id && s.total_score != null && s.max_score);
        const avg = courseSubs.length
          ? Math.round(courseSubs.reduce((sum, s) => sum + (Number(s.total_score) / Number(s.max_score)) * 100, 0) / courseSubs.length)
          : null;
        return {
          enrollmentId: e.id,
          course: e.courses,
          courseId: e.course_id,
          totalLessons: total,
          doneLessons: done,
          progress: total ? Math.round((done / total) * 100) : 0,
          avgScore: avg,
        };
      });
      return {
        enrollments,
        courses,
        assessments: unwrap(assessments),
        submissions: subs,
        sessions: unwrap(sessions),
        attendance: unwrap(attendance),
        interventions: interventions.data ?? [],
      };
    },
  });
}

export type StudentOverview = Awaited<ReturnType<NonNullable<ReturnType<typeof studentOverviewQuery>["queryFn"]>>>;
