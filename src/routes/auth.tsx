import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import "@lovable.dev/cloud-auth-js/styles.css";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Brand } from "@/components/brand";
import { AccountTypePicker, GradeSelect, type AccountType } from "@/components/onboarding";

type Search = { redirect?: string; mode?: "signin" | "signup" };

function safeRedirect(r: string | undefined) {
  if (r && r.startsWith("/") && !r.startsWith("//") && !r.startsWith("/auth")) return r;
  return "/dashboard";
}

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    ...(typeof s["redirect"] === "string" ? { redirect: s["redirect"] } : {}),
    ...(s["mode"] === "signup" || s["mode"] === "signin" ? { mode: s["mode"] } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Sign in or create an account — Brightpath Academy" },
      { name: "description", content: "Sign in to Brightpath Academy or create a student, parent or instructor account." },
      { property: "og:title", content: "Sign in — Brightpath Academy" },
      { property: "og:description", content: "Access your courses, family dashboard or teaching tools." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">(search.mode ?? "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [type, setType] = useState<AccountType>("student");
  const [grade, setGrade] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const target = safeRedirect(search.redirect);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: target });
      } else if (mode === "signup") {
        if (type === "student" && !grade) throw new Error("Please choose a grade level");
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin + "/dashboard",
            data: { full_name: fullName, account_type: type, grade_level_id: type === "student" ? grade : "" },
          },
        });
        if (error) throw error;
        if (data.session) navigate({ to: target });
        else setSent("Check your email to confirm your account, then sign in.");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setSent("If that email has an account, a reset link is on its way.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function social(provider: "google" | "lovable") {
    const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin + "/auth" });
    if (result.error) return toast.error(result.error.message);
    if (result.redirected) return;
    navigate({ to: target });
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="dotted-bg hidden flex-col justify-between border-r-2 border-ink bg-sun-soft p-12 lg:flex">
        <Brand />
        <div>
          <h2 className="font-display text-5xl font-extrabold leading-tight">
            Every learner, <span className="marker">every grade.</span>
          </h2>
          <p className="mt-4 max-w-md text-lg text-muted-foreground">
            Guided lessons for little ones, self-paced courses for older students, and a clear view for
            families.
          </p>
        </div>
        <p className="text-sm text-muted-foreground">Pre-KG → Grade 12</p>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Brand />
          </div>
          <h1 className="font-display text-3xl font-extrabold">
            {mode === "signin" ? "Welcome back" : mode === "signup" ? "Create your account" : "Reset your password"}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {mode === "signin"
              ? "Sign in to continue learning."
              : mode === "signup"
                ? "It takes less than a minute."
                : "We'll email you a link to choose a new one."}
          </p>

          {sent ? (
            <div className="pop-card mt-8 bg-teal-soft p-6">
              <p className="font-semibold">{sent}</p>
              <Button variant="link" className="mt-2 px-0" onClick={() => { setSent(null); setMode("signin"); }}>
                Back to sign in
              </Button>
            </div>
          ) : (
            <>
              {mode !== "forgot" && (
                <div className="mt-8 grid gap-2">
                  <Button variant="outline" size="lg" onClick={() => social("google")} type="button">
                    <GoogleIcon /> Continue with Google
                  </Button>
                  <button type="button" className="lovable-auth-button" onClick={() => social("lovable")}>
                    Continue with Lovable
                  </button>
                  <div className="my-3 flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <span className="h-px flex-1 bg-border" /> or with email <span className="h-px flex-1 bg-border" />
                  </div>
                </div>
              )}
              <form onSubmit={onSubmit} className="grid gap-4">
                {mode === "signup" && (
                  <>
                    <div className="grid gap-1.5">
                      <Label htmlFor="name">Full name</Label>
                      <Input id="name" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="border-2 bg-card" />
                    </div>
                    <div className="grid gap-1.5">
                      <Label>I am a…</Label>
                      <AccountTypePicker value={type} onChange={setType} />
                    </div>
                    {type === "student" && <GradeSelect value={grade} onChange={setGrade} />}
                  </>
                )}
                <div className="grid gap-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="border-2 bg-card" />
                </div>
                {mode !== "forgot" && (
                  <div className="grid gap-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      {mode === "signin" && (
                        <button type="button" onClick={() => setMode("forgot")} className="text-xs font-semibold text-teal hover:underline">
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <Input id="password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="border-2 bg-card" />
                  </div>
                )}
                <Button type="submit" variant="hero" size="lg" disabled={busy}>
                  {mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}
                </Button>
              </form>
              <p className="mt-6 text-center text-sm text-muted-foreground">
                {mode === "signin" ? (
                  <>New here? <button className="font-bold text-foreground underline" onClick={() => setMode("signup")}>Create an account</button></>
                ) : (
                  <>Already have an account? <button className="font-bold text-foreground underline" onClick={() => setMode("signin")}>Sign in</button></>
                )}
              </p>
              <p className="mt-2 text-center text-xs text-muted-foreground">
                <Link to="/catalog" className="hover:underline">Browse courses first →</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.2 14.6 2.2 12 2.2 6.6 2.2 2.3 6.6 2.3 12s4.3 9.8 9.7 9.8c5.6 0 9.3-3.9 9.3-9.5 0-.6-.1-1.1-.2-1.6H12z" />
    </svg>
  );
}
