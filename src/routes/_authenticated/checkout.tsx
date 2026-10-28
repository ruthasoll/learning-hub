import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/ui-kit";

export const Route = createFileRoute("/_authenticated/checkout")({
  validateSearch: (s: Record<string, unknown>): { courseId?: string; planId?: string } => ({
    ...(typeof s["courseId"] === "string" ? { courseId: s["courseId"] } : {}),
    ...(typeof s["planId"] === "string" ? { planId: s["planId"] } : {}),
  }),
  head: () => ({ meta: [{ title: "Checkout — Brightpath" }] }),
  component: () => <ComingSoon title="Checkout" />,
});
