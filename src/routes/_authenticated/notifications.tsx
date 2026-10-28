import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/ui-kit";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({ meta: [{ title: "Notifications — Brightpath" }] }),
  component: () => <ComingSoon title="Notifications" />,
});
