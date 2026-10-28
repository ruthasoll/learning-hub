import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/ui-kit";

export const Route = createFileRoute("/_authenticated/finance/")({
  head: () => ({ meta: [{ title: "Finance — Brightpath" }] }),
  component: () => <ComingSoon title="Finance" />,
});
