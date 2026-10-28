import { Link } from "@tanstack/react-router";
import { Video, Users, Sparkles } from "lucide-react";
import { money } from "@/lib/format";
import { MODE_LABEL } from "@/lib/catalog";
import { Pill } from "@/components/ui-kit";
import { cn } from "@/lib/utils";

const BANDS = ["bg-sun", "bg-teal", "bg-coral", "bg-ink"] as const;

export function bandFor(id: string) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return BANDS[h % BANDS.length] ?? "bg-sun";
}

export type CourseCardData = {
  id: string;
  title: string;
  summary: string;
  price: number;
  currency: string;
  delivery_mode: "guided" | "self_paced";
  live_sessions_enabled: boolean;
  subjects: { name: string } | null;
  grade_levels: { name: string } | null;
};

export function CourseCard({ course }: { course: CourseCardData }) {
  return (
    <Link
      to="/courses/$courseId"
      params={{ courseId: course.id }}
      className="group pop-card flex flex-col overflow-hidden transition-transform hover:-translate-y-1"
    >
      <div className={cn("relative h-24 border-b-2 border-ink", bandFor(course.id))}>
        <div className="dotted-bg absolute inset-0 opacity-60" />
        <span className="absolute bottom-3 left-4 rounded-full border-2 border-ink bg-card px-3 py-0.5 text-xs font-bold">
          {course.grade_levels?.name ?? "All grades"}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs font-bold uppercase tracking-wider text-teal">{course.subjects?.name ?? "General"}</p>
        <h3 className="mt-1 font-display text-xl font-bold leading-tight group-hover:underline">{course.title}</h3>
        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{course.summary}</p>
        <div className="mt-4 flex flex-wrap gap-1.5">
          <Pill tone={course.delivery_mode === "guided" ? "sun" : "teal"}>
            {course.delivery_mode === "guided" ? <Users className="size-3" /> : <Sparkles className="size-3" />}
            {MODE_LABEL[course.delivery_mode]}
          </Pill>
          {course.live_sessions_enabled && (
            <Pill>
              <Video className="size-3" /> Live classes
            </Pill>
          )}
        </div>
        <div className="mt-auto pt-5">
          <p className="font-display text-2xl font-extrabold">{money(course.price, course.currency)}</p>
        </div>
      </div>
    </Link>
  );
}
