import type { ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow && (
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-teal">{eyebrow}</p>
        )}
        <h1 className="font-display text-3xl font-extrabold md:text-4xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

const statVariants = cva("pop-card p-5", {
  variants: {
    tone: {
      default: "",
      sun: "bg-sun-soft",
      teal: "bg-teal-soft",
      coral: "bg-coral-soft",
    },
  },
  defaultVariants: { tone: "default" },
});

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
} & VariantProps<typeof statVariants>) {
  return (
    <div className={statVariants({ tone })}>
      <div className="flex items-start justify-between">
        <p className="text-sm font-semibold text-muted-foreground">{label}</p>
        {icon && <span className="text-foreground/70">{icon}</span>}
      </div>
      <p className="mt-2 font-display text-3xl font-extrabold">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-card/60 px-6 py-12 text-center">
      {icon && <div className="mb-3 text-teal">{icon}</div>}
      <p className="font-display text-lg font-bold">{title}</p>
      {description && <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" /> {label}
    </div>
  );
}

export function Section({
  title,
  actions,
  children,
  className,
}: {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("mb-10", className)}>
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="font-display text-xl font-bold">{title}</h2>
        {actions}
      </div>
      {children}
    </section>
  );
}

const pillVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold capitalize whitespace-nowrap",
  {
    variants: {
      tone: {
        neutral: "border-border bg-muted text-muted-foreground",
        sun: "border-sun bg-sun-soft text-foreground",
        teal: "border-teal bg-teal-soft text-foreground",
        coral: "border-coral bg-coral-soft text-foreground",
        ink: "border-ink bg-ink text-ink-foreground",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export type PillTone = NonNullable<VariantProps<typeof pillVariants>["tone"]>;

export function Pill({ tone, children }: { tone?: PillTone; children: ReactNode }) {
  return <span className={pillVariants({ tone })}>{children}</span>;
}

const STATUS_TONE: Record<string, PillTone> = {
  draft: "neutral",
  pending: "sun",
  approved: "teal",
  rejected: "coral",
  published: "ink",
  succeeded: "teal",
  failed: "coral",
  refunded: "sun",
  disputed: "coral",
  verified: "teal",
  active: "teal",
  revoked: "coral",
  submitted: "sun",
  graded: "teal",
  open: "sun",
  resolved: "teal",
  present: "teal",
  absent: "coral",
  late: "sun",
};

export function StatusPill({ status }: { status: string }) {
  const label = status === "pending" ? "pending review" : status.replace(/_/g, " ");
  return <Pill tone={STATUS_TONE[status] ?? "neutral"}>{label}</Pill>;
}

export function ProgressBar({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="h-3 w-full overflow-hidden rounded-full border-2 border-ink bg-card">
      <div className="h-full bg-teal transition-all" style={{ width: `${v}%` }} />
    </div>
  );
}

export function NoAccess() {
  return (
    <EmptyState
      title="This area isn't part of your account"
      description="Ask a platform administrator if you think you should have access."
    />
  );
}

export function ComingSoon({ title }: { title: string }) {
  return (
    <div>
      <PageHeader title={title} />
      <EmptyState
        title="This section is still being built"
        description="It will be finished in the next round of work."
      />
    </div>
  );
}
