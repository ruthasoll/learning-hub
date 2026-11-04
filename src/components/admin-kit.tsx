import type { ReactNode } from "react";
import { hasAnyRole, useMe, type Role } from "@/lib/session";
import { NoAccess } from "@/components/ui-kit";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** Show children only to users holding one of the given roles. */
export function RoleGate({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const me = useMe();
  if (!hasAnyRole(me, roles)) return <NoAccess />;
  return <>{children}</>;
}

export function TableCard({ head, children, className }: { head: ReactNode[]; children: ReactNode; className?: string }) {
  return (
    <div className={cn("pop-card-flat overflow-x-auto", className)}>
      <table className="w-full text-sm">
        <thead className="border-b-2 border-ink bg-muted text-left">
          <tr>
            {head.map((h, i) => (
              <th key={i} className="whitespace-nowrap p-3 font-bold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&>tr]:border-b [&>tr:last-child]:border-0 [&_td]:p-3 [&_td]:align-top">{children}</tbody>
      </table>
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** Radix Select can't hold an empty value; use this sentinel for "none". */
export const NONE = "__none__";
export const fromSel = (v: string) => (v === NONE ? null : v);
export const toSel = (v: string | null | undefined) => v ?? NONE;
