import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui-kit";
import { RoleGate } from "@/components/admin-kit";
import { SettingsEditor } from "@/components/settings-editor";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  head: () => ({ meta: [{ title: "Settings — Brightpath" }, { name: "description", content: "Platform-wide settings." }] }),
  component: () => (
    <RoleGate roles={["platform_admin"]}>
      <PageHeader eyebrow="Platform admin" title="Settings" description="School-wide rules for alerts, support and sign-in." />
      <SettingsEditor
        defs={[
          { key: "platform_name", label: "Platform name", type: "text" },
          { key: "support_email", label: "Support email", type: "text" },
          { key: "low_score_threshold", label: "Low score threshold (%)", hint: "Scores below this alert the teacher and parent.", type: "number" },
          { key: "low_score_template", label: "Low score message", hint: "Use {student}, {score} and {assessment}.", type: "text" },
          { key: "overdue_alerts_enabled", label: "Alert parents about overdue work", type: "bool" },
          { key: "session_timeout_minutes", label: "Sign-out after inactivity (minutes)", type: "number" },
        ]}
      />
    </RoleGate>
  ),
});
