import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { GraduationCap, HeartHandshake, Presentation } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const ACCOUNT_TYPES = [
  { value: "student", label: "Student", desc: "Take courses and track your progress", icon: GraduationCap },
  { value: "parent", label: "Parent / Guardian", desc: "Follow your child's learning", icon: HeartHandshake },
  { value: "instructor", label: "Instructor", desc: "Create and teach courses (needs approval)", icon: Presentation },
] as const;

export type AccountType = (typeof ACCOUNT_TYPES)[number]["value"];

export function useGradeLevels() {
  return useQuery({
    queryKey: ["grade_levels"],
    queryFn: async () => {
      const { data, error } = await supabase.from("grade_levels").select("*").order("sort_order");
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60_000,
  });
}

export function AccountTypePicker({
  value,
  onChange,
}: {
  value: AccountType;
  onChange: (v: AccountType) => void;
}) {
  return (
    <div className="grid gap-2">
      {ACCOUNT_TYPES.map((t) => (
        <button
          key={t.value}
          type="button"
          onClick={() => onChange(t.value)}
          className={cn(
            "flex items-center gap-3 rounded-xl border-2 p-3 text-left transition-all",
            value === t.value ? "border-ink bg-sun-soft shadow-pop-sm" : "border-border bg-card hover:border-ink",
          )}
        >
          <t.icon className="size-5 shrink-0 text-teal" />
          <span>
            <span className="block text-sm font-bold">{t.label}</span>
            <span className="block text-xs text-muted-foreground">{t.desc}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

export function GradeSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const grades = useGradeLevels();
  return (
    <div className="grid gap-1.5">
      <Label>Grade level</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="border-2 border-input bg-card">
          <SelectValue placeholder="Choose a grade" />
        </SelectTrigger>
        <SelectContent>
          {(grades.data ?? []).map((g) => (
            <SelectItem key={g.id} value={g.id}>
              {g.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function Onboarding() {
  const [type, setType] = useState<AccountType>("student");
  const [grade, setGrade] = useState("");
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();

  async function save() {
    setBusy(true);
    const { error } = await supabase.rpc("choose_account_type", {
      _type: type,
      ...(type === "student" && grade ? { _grade_level_id: grade } : {}),
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("You're all set!");
    await qc.invalidateQueries({ queryKey: ["me"] });
  }

  return (
    <div className="pop-card mx-auto mt-6 max-w-lg p-8">
      <h1 className="font-display text-2xl font-extrabold">Welcome to Brightpath!</h1>
      <p className="mt-1 text-muted-foreground">How will you use your account?</p>
      <div className="mt-6 grid gap-5">
        <AccountTypePicker value={type} onChange={setType} />
        {type === "student" && <GradeSelect value={grade} onChange={setGrade} />}
        <Button variant="hero" size="lg" onClick={save} disabled={busy || (type === "student" && !grade)}>
          Continue
        </Button>
      </div>
    </div>
  );
}
