import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/ui-kit";

export const Route = createFileRoute("/_authenticated/teach/")({
  head: () => ({ meta: [{ title: "My courses — Brightpath" }] }),
  component: () => <ComingSoon title="My courses" />,
});
