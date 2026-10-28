import { createFileRoute, Link } from "@tanstack/react-router";
import { useMe } from "@/lib/session";
import { PageHeader, NoAccess } from "@/components/ui-kit";
import { StudentDashboard } from "@/components/student-dashboard";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/learn/")({
  head: () => ({ meta: [{ title: "My learning — Brightpath" }] }),
  component: LearnHome,
});

function LearnHome() {
  const me = useMe();
  if (!me.roles.includes("student")) return <NoAccess />;
  const first = (me.profile?.full_name || "there").split(" ")[0];
  return (
    <div>
      <PageHeader
        eyebrow="My learning"
        title={`Hi ${first}!`}
        description="Pick up where you left off."
        actions={<Button asChild variant="outline"><Link to="/catalog">Find more courses</Link></Button>}
      />
      <StudentDashboard studentId={me.id} viewer="student" />
    </div>
  );
}
