import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { meQuery, ROLE_LABEL, useMe } from "@/lib/session";
import { act, gradeLevelsQuery } from "@/lib/actions";
import { dateShort } from "@/lib/format";
import { PageHeader, Pill, Section } from "@/components/ui-kit";
import { Field, fromSel, toSel, NONE } from "@/components/admin-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "My profile — Brightpath" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const me = useMe();
  const qc = useQueryClient();
  const grades = useQuery(gradeLevelsQuery);
  const p = me.profile;
  const [name, setName] = useState(p?.full_name ?? "");
  const [phone, setPhone] = useState(p?.phone ?? "");
  const [grade, setGrade] = useState<string>(toSel(p?.grade_level_id));
  const [inApp, setInApp] = useState(p?.notify_in_app ?? true);
  const [email, setEmail] = useState(p?.notify_email ?? true);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    const ok = await act(
      supabase
        .from("profiles")
        .update({
          full_name: name.trim(),
          phone: phone.trim() || null,
          grade_level_id: me.roles.includes("student") ? fromSel(grade) : p?.grade_level_id ?? null,
          notify_in_app: inApp,
          notify_email: email,
        })
        .eq("id", me.id),
      "Profile saved",
    );
    setBusy(false);
    if (ok) await qc.invalidateQueries({ queryKey: meQuery.queryKey });
  }

  async function changePassword() {
    if (pw.length < 8) return void act(Promise.resolve({ error: { message: "Use at least 8 characters" } }));
    if (pw !== pw2) return void act(Promise.resolve({ error: { message: "The two passwords don't match" } }));
    const ok = await act(supabase.auth.updateUser({ password: pw }), "Password updated");
    if (ok) {
      setPw("");
      setPw2("");
    }
  }

  return (
    <div className="max-w-3xl">
      <PageHeader eyebrow="Profile" title="Your account" description="Update your details and choose how we keep you informed." />

      <Section title="About you">
        <div className="pop-card grid gap-4 p-6 md:grid-cols-2">
          <Field label="Full name">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Email" hint="Contact a platform administrator to change your email.">
            <Input value={me.email ?? ""} disabled />
          </Field>
          <Field label="Phone (optional)">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
          {me.roles.includes("student") && (
            <Field label="Grade level">
              <Select value={grade} onValueChange={setGrade}>
                <SelectTrigger><SelectValue placeholder="Choose grade" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Not set</SelectItem>
                  {(grades.data ?? []).map((g) => (
                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
          <div className="md:col-span-2">
            <p className="mb-2 text-sm font-semibold">Roles</p>
            <div className="flex flex-wrap gap-2">
              {me.roles.map((r) => <Pill key={r} tone="teal">{ROLE_LABEL[r]}</Pill>)}
              {p?.requested_role === "instructor" && !me.roles.includes("instructor") && <Pill tone="sun">Instructor request pending</Pill>}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Member since {dateShort(p?.created_at)}</p>
          </div>
        </div>
      </Section>

      <Section title="Notifications">
        <div className="pop-card grid gap-4 p-6">
          <label className="flex items-center justify-between gap-4">
            <span>
              <span className="block font-semibold">In-app alerts</span>
              <span className="text-sm text-muted-foreground">Grades, live classes, messages and learning-support alerts in the bell menu.</span>
            </span>
            <Switch checked={inApp} onCheckedChange={setInApp} />
          </label>
          <label className="flex items-center justify-between gap-4">
            <span>
              <span className="block font-semibold">Email updates</span>
              <span className="text-sm text-muted-foreground">Important updates sent to your email address.</span>
            </span>
            <Switch checked={email} onCheckedChange={setEmail} />
          </label>
        </div>
      </Section>

      <div className="mb-10 flex flex-wrap gap-2">
        <Button onClick={save} disabled={busy || !name.trim()}><Save /> Save changes</Button>
        {me.roles.includes("parent") && (
          <Button variant="outline" asChild><Link to="/family">Manage linked children</Link></Button>
        )}
      </div>

      <Section title="Password">
        <div className="pop-card grid gap-4 p-6 md:grid-cols-2">
          <Field label="New password"><Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} /></Field>
          <Field label="Repeat new password"><Input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} /></Field>
          <div className="md:col-span-2">
            <Button variant="outline" onClick={changePassword} disabled={!pw}><KeyRound /> Update password</Button>
          </div>
        </div>
      </Section>
    </div>
  );
}
