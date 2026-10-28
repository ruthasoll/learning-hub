import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/ui-kit";

export const Route = createFileRoute("/_authenticated/family")({
  head: () => ({ meta: [{ title: "Family dashboard — Brightpath" }] }),
  component: () => <ComingSoon title="Family dashboard" />,
});
