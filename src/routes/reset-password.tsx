import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Brand } from "@/components/brand";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Choose a new password — Brightpath Academy" },
      { name: "description", content: "Set a new password for your Brightpath Academy account." },
      { property: "og:title", content: "Reset password — Brightpath Academy" },
      { property: "og:description", content: "Set a new password for your account." },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const isRecovery = window.location.hash.includes("type=recovery");
    supabase.auth.getSession().then(({ data }) => setReady(isRecovery || !!data.session));
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password updated");
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="dotted-bg flex min-h-screen items-center justify-center bg-sun-soft p-6">
      <div className="pop-card w-full max-w-md p-8">
        <Brand />
        <h1 className="mt-6 font-display text-2xl font-extrabold">Choose a new password</h1>
        {ready ? (
          <form onSubmit={save} className="mt-6 grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="pw">New password</Label>
              <Input id="pw" type="password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} className="border-2" />
            </div>
            <Button variant="hero" size="lg" disabled={busy}>Save password</Button>
          </form>
        ) : (
          <p className="mt-4 text-muted-foreground">Open this page from the link in your reset email.</p>
        )}
      </div>
    </div>
  );
}
