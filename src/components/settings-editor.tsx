import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { unwrap } from "@/lib/session";
import { act } from "@/lib/actions";
import { Loading } from "@/components/ui-kit";
import { Field } from "@/components/admin-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { Json } from "@/integrations/supabase/types";

export type SettingDef = { key: string; label: string; hint?: string; type: "text" | "number" | "bool" };

/** Edit a set of platform_settings rows; access is enforced by database rules. */
export function SettingsEditor({ defs }: { defs: SettingDef[] }) {
  const qc = useQueryClient();
  const rows = useQuery({ queryKey: ["settings"], queryFn: async () => unwrap(await supabase.from("platform_settings").select("*")) });
  const [vals, setVals] = useState<Record<string, Json>>({});
  useEffect(() => {
    if (rows.data) setVals(Object.fromEntries(rows.data.map((r) => [r.key, r.value])));
  }, [rows.data]);
  if (rows.isLoading) return <Loading />;

  async function save() {
    const payload = defs.map((d) => {
      const v = vals[d.key];
      const value: Json = d.type === "number" ? Number(v ?? 0) : d.type === "bool" ? v === true : String(v ?? "");
      return { key: d.key, value, updated_at: new Date().toISOString() };
    });
    if (await act(supabase.from("platform_settings").upsert(payload), "Settings saved")) await qc.invalidateQueries({ queryKey: ["settings"] });
  }

  return (
    <div className="pop-card grid max-w-2xl gap-5 p-6">
      {defs.map((d) => (
        <Field key={d.key} label={d.label} hint={d.hint}>
          {d.type === "bool" ? (
            <Switch checked={vals[d.key] === true} onCheckedChange={(c) => setVals({ ...vals, [d.key]: c })} />
          ) : (
            <Input type={d.type === "number" ? "number" : "text"} value={String(vals[d.key] ?? "")} onChange={(e) => setVals({ ...vals, [d.key]: e.target.value })} />
          )}
        </Field>
      ))}
      <div><Button onClick={save}>Save settings</Button></div>
    </div>
  );
}
