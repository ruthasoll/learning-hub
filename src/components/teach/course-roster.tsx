import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Download, MessageSquare } from "lucide-react";
import { courseRosterQuery } from "@/lib/teach";
import { dateShort, downloadCsv } from "@/lib/format";
import { EmptyState, Loading, Pill, ProgressBar, StatusPill } from "@/components/ui-kit";
import { TableCard } from "@/components/admin-kit";
import { Button } from "@/components/ui/button";

export function CourseRoster({ courseId, courseTitle }: { courseId: string; courseTitle: string }) {
  const roster = useQuery(courseRosterQuery(courseId));
  if (roster.isLoading) return <Loading />;
  const d = roster.data;
  if (!d || d.enrollments.length === 0) return <EmptyState title="No students yet" description="Students appear here once they enroll." />;

  const rows = d.enrollments.map((e) => {
    const done = d.progress.filter((p) => p.student_id === e.student_id).length;
    const subs = d.submissions.filter((s) => s.student_id === e.student_id && s.total_score != null && Number(s.max_score) > 0);
    const avg = subs.length ? Math.round(subs.reduce((n, s) => n + Number(s.total_score) / Number(s.max_score), 0) / subs.length * 100) : null;
    const pct = d.lessonCount ? Math.round((done / d.lessonCount) * 100) : 0;
    const flagged = d.submissions.some((s) => s.student_id === e.student_id && s.flagged);
    return { e, done, pct, avg, flagged, submitted: d.submissions.filter((s) => s.student_id === e.student_id).length };
  });

  function exportCsv() {
    downloadCsv(`${courseTitle}-report`, rows.map((r) => ({
      student: r.e.student?.full_name ?? "",
      email: r.e.student?.email ?? "",
      enrolled: dateShort(r.e.created_at),
      status: r.e.status,
      lessons_completed: r.done,
      completion_pct: r.pct,
      submissions: r.submitted,
      average_score_pct: r.avg ?? "",
      needs_support: r.flagged ? "yes" : "no",
    })));
  }

  return (
    <div className="grid gap-4">
      <div className="flex justify-end"><Button variant="outline" onClick={exportCsv}><Download /> Export report</Button></div>
      <TableCard head={["Student", "Enrolled", "Completion", "Avg. score", "Status", ""]}>
        {rows.map((r) => (
          <tr key={r.e.id}>
            <td>
              <p className="font-semibold">{r.e.student?.full_name ?? "Student"}</p>
              <p className="text-xs text-muted-foreground">{r.e.student?.email}</p>
            </td>
            <td className="whitespace-nowrap">{dateShort(r.e.created_at)}</td>
            <td className="min-w-40">
              <ProgressBar value={r.pct} />
              <p className="mt-1 text-xs text-muted-foreground">{r.done}/{d.lessonCount} lessons</p>
            </td>
            <td>{r.avg == null ? "—" : `${r.avg}%`} {r.flagged && <Pill tone="coral">needs support</Pill>}</td>
            <td><StatusPill status={r.e.status} /></td>
            <td>
              <Button size="sm" variant="ghost" asChild>
                <Link to="/messages" search={{ to: r.e.student_id }}><MessageSquare /> Message</Link>
              </Button>
            </td>
          </tr>
        ))}
      </TableCard>
    </div>
  );
}
