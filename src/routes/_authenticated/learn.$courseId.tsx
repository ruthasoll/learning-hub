import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/ui-kit";

export const Route = createFileRoute("/_authenticated/learn/$courseId")({
  head: () => ({ meta: [{ title: "Course — Brightpath" }] }),
  component: () => <ComingSoon title="Course" />,
});
