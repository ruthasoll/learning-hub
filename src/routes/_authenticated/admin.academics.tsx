import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { unwrap } from "@/lib/session";
import { act, gradeLevelsQuery, periodsQuery } from "@/lib/actions";
import { dateShort } from "@/lib/format";
import { Loading, PageHeader, Pill, Section } from "@/components/ui-kit";
import { RoleGate, TableCard } from "@/components/admin-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/admin/academics")({
  head: () => ({ meta: [{ title: "Academic structure — Brightpath" }, { name: "description", content: "Grades, subjects and terms." }] }),
  component: () => (
    <RoleGate roles={["platform_admin"]}>
      <Academics />
    </RoleGate>
  ),
});

function Academics() {
  const qc = useQueryClient();
  const grades = useQuery(gradeLevelsQuery);
  const periods = useQuery(periodsQuery);
  const subjects = useQuery({ queryKey: ["subjects"], queryFn: async () => unwrap(await supabase.from("subjects").select("*").order("name")) });
  const [g, setG] = useState({ name: "", mode: "guided" as "guided" | "self_paced" });
  const [s, setS] = useState("");
  const [p, setP] = useState({ name: "", starts_on: "", ends_on: "" });
  const inv = (k: string) => qc.invalidateQueries({ queryKey: [k] });

  if (grades.isLoading || subjects.isLoading) return <Loading />;
  return (
    <div>
      <PageHeader eyebrow="Platform admin" title="Academic structure" description="Grade levels, subjects and terms used across every course." />
      <Section title="Grade levels">
        <TableCard head={["Grade", "Default learning style", ""]}>
          {(grades.data ?? []).map((x) => (
            <tr key={x.id}>
              <td className="font-semibold">{x.name}</td>
              <td>
                <Select value={x.default_mode} onValueChange={async (v) => (await act(supabase.from("grade_levels").update({ default_mode: v as "guided" }).eq("id", x.id), "Saved")) && inv("grade_levels")}>
                  <SelectTrigger className="h-8 w-44"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="guided">Teacher-guided</SelectItem><SelectItem value="self_paced">Self-paced</SelectItem></SelectContent>
                </Select>
              </td>
              <td><Button size="icon" variant="ghost" aria-label="Delete grade" onClick={async () => window.confirm("Delete this grade?") && (await act(supabase.from("grade_levels").delete().eq("id", x.id), "Deleted")) && inv("grade_levels")}><Trash2 /></Button></td>
            </tr>
          ))}
        </TableCard>
        <div className="mt-3 flex gap-2">
          <Input className="max-w-xs" placeholder="New grade, e.g. Grade 13" value={g.name} onChange={(e) => setG({ ...g, name: e.target.value })} />
          <Button disabled={!g.name.trim()} onClick={async () => { if (await act(supabase.from("grade_levels").insert({ name: g.name.trim(), default_mode: g.mode, sort_order: (grades.data?.length ?? 0) + 1 }), "Grade added")) { setG({ ...g, name: "" }); await inv("grade_levels"); } }}>Add grade</Button>
        </div>
      </Section>
      <Section title="Subjects">
        <div className="flex flex-wrap gap-2">
          {(subjects.data ?? []).map((x) => (
            <span key={x.id} className="inline-flex items-center gap-1 rounded-full border-2 border-ink bg-card px-3 py-1 text-sm font-semibold">
              {x.name}
              <button aria-label={`Delete ${x.name}`} onClick={async () => window.confirm(`Delete ${x.name}?`) && (await act(supabase.from("subjects").delete().eq("id", x.id), "Deleted")) && inv("subjects")}><Trash2 className="size-3" /></button>
            </span>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <Input className="max-w-xs" placeholder="New subject" value={s} onChange={(e) => setS(e.target.value)} />
          <Button disabled={!s.trim()} onClick={async () => { if (await act(supabase.from("subjects").insert({ name: s.trim() }), "Subject added")) { setS(""); await inv("subjects"); } }}>Add subject</Button>
        </div>
      </Section>
      <Section title="Terms">
        <TableCard head={["Term", "Starts", "Ends", ""]}>
          {(periods.data ?? []).map((x) => (
            <tr key={x.id}>
              <td className="font-semibold">{x.name} {x.is_current && <Pill tone="teal">current</Pill>}</td>
              <td>{dateShort(x.starts_on)}</td>
              <td>{dateShort(x.ends_on)}</td>
              <td>{!x.is_current && <Button size="sm" variant="outline" onClick={async () => { await supabase.from("academic_periods").update({ is_current: false }).neq("id", x.id); if (await act(supabase.from("academic_periods").update({ is_current: true }).eq("id", x.id), "Current term set")) await inv("periods"); }}>Make current</Button>}</td>
            </tr>
          ))}
        </TableCard>
        <div className="mt-3 flex flex-wrap gap-2">
          <Input className="max-w-xs" placeholder="Term name" value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} />
          <Input type="date" className="w-40" value={p.starts_on} onChange={(e) => setP({ ...p, starts_on: e.target.value })} />
          <Input type="date" className="w-40" value={p.ends_on} onChange={(e) => setP({ ...p, ends_on: e.target.value })} />
          <Button disabled={!p.name.trim()} onClick={async () => { if (await act(supabase.from("academic_periods").insert({ name: p.name.trim(), starts_on: p.starts_on || null, ends_on: p.ends_on || null }), "Term added")) { setP({ name: "", starts_on: "", ends_on: "" }); await inv("periods"); } }}>Add term</Button>
        </div>
      </Section>
    </div>
  );
}
