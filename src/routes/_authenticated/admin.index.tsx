import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/ui-kit";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "Platform admin — Brightpath" }] }),
  component: () => <ComingSoon title="Platform admin" />,
});
