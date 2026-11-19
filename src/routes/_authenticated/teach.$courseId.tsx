import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useMe } from "@/lib/session";
import { teachCourseQuery, COURSE_STATUS_HELP } from "@/lib/teach";
import { EmptyState, Loading, PageHeader, StatusPill } from "@/components/ui-kit";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { CourseDetails } from "@/components/teach/course-details";
import { CourseContent } from "@/components/teach/course-content";
import { CourseAssessments } from "@/components/teach/course-assessments";
import { CourseLive } from "@/components/teach/course-live";
import { CourseRoster } from "@/components/teach/course-roster";

export const Route = createFileRoute("/_authenticated/teach/$courseId")({
  head: () => ({ meta: [{ title: "Course editor — Brightpath" }] }),
  component: CourseEditor,
});

function CourseEditor() {
  const { courseId } = Route.useParams();
  const me = useMe();
  const course = useQuery(teachCourseQuery(courseId));
  const isAdmin = me.roles.includes("platform_admin");

  if (course.isLoading) return <Loading />;
  const c = course.data;
  if (!c || (c.instructor_id !== me.id && !isAdmin))
    return <EmptyState title="Course not found" description="It may have been removed, or it isn't assigned to you." />;

  return (
    <div>
      <Button asChild variant="ghost" size="sm" className="mb-3">
        <Link to={isAdmin && c.instructor_id !== me.id ? "/admin" : "/teach"}><ArrowLeft /> Back</Link>
      </Button>
      <PageHeader eyebrow={`${c.subjects?.name ?? "Course"} · ${c.grade_levels?.name ?? "No grade"}`} title={c.title} description={COURSE_STATUS_HELP[c.status]} actions={<StatusPill status={c.status} />} />
      {c.status === "rejected" && c.review_comment && (
        <div className="mb-6 rounded-xl border-2 border-coral bg-coral-soft p-4 text-sm">
          <p className="font-bold">Reviewer feedback</p>
          <p className="mt-1 whitespace-pre-wrap">{c.review_comment}</p>
        </div>
      )}
      <Tabs defaultValue="details">
        <TabsList className="mb-6 flex h-auto flex-wrap justify-start">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="content">Lessons</TabsTrigger>
          <TabsTrigger value="assessments">Assessments</TabsTrigger>
          <TabsTrigger value="live">Live classes</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
        </TabsList>
        <TabsContent value="details"><CourseDetails course={c} /></TabsContent>
        <TabsContent value="content"><CourseContent courseId={c.id} /></TabsContent>
        <TabsContent value="assessments"><CourseAssessments courseId={c.id} /></TabsContent>
        <TabsContent value="live"><CourseLive courseId={c.id} /></TabsContent>
        <TabsContent value="students"><CourseRoster courseId={c.id} courseTitle={c.title} /></TabsContent>
      </Tabs>
    </div>
  );
}
