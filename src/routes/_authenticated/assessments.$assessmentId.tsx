import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/ui-kit";

export const Route = createFileRoute("/_authenticated/assessments/$assessmentId")({
  head: () => ({ meta: [{ title: "Assessment — Brightpath" }] }),
  component: () => <ComingSoon title="Assessment" />,
});
