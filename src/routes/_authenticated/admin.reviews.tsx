import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { unwrap } from "@/lib/session";
import type { TablesUpdate } from "@/integrations/supabase/types";
import { act } from "@/lib/actions";
import { courseAssessmentsQuery, courseOutlineQuery } from "@/lib/teach";
import { MODE_LABEL } from "@/lib/catalog";
import { ago, money } from "@/lib/format";
import { EmptyState, Loading, PageHeader, Pill, StatusPill } from "@/components/ui-kit";
import { RoleGate } from "@/components/admin-kit";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/admin/reviews")({
  head: () => ({ meta: [{ title: "Course reviews — Brightpath" }] }),
  component: () => (
    <RoleGate roles={["platform_admin"]}>
      <Reviews />
    </RoleGate>
  ),
});

type Filter = "pending" | "approved" | "published" | "rejected" | "draft";

function Reviews() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filter>("pending");
  const [inspect, setInspect] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, string>>({});

  const courses = useQuery({
    queryKey: ["admin-courses"],
    queryFn: async () =>
      unwrap(
        await supabase
          .from("courses")
          .select(
            "*, subjects(name), grade_levels(name), instructor:profiles!courses_instructor_id_fkey(full_name)",
          )
          .order("updated_at", { ascending: false }),
      ),
  });

  async function update(id: string, patch: TablesUpdate<"courses">, ok: string) {
    if (await act(supabase.from("courses").update(patch).eq("id", id), ok)) {
      await qc.invalidateQueries({ queryKey: ["admin-courses"] });
      await qc.invalidateQueries({ queryKey: ["admin-overview"] });
    }
  }
  function reject(id: string) {
    const c = comments[id]?.trim();
    if (!c) return void toast.error("Tell the instructor what to change before rejecting");
    return update(
      id,
      { status: "rejected", review_comment: c },
      "Course returned to the instructor",
    );
  }
  function approve(id: string) {
    return update(
      id,
      { status: "approved", review_comment: comments[id]?.trim() || null },
      "Course approved",
    );
  }

  const all = courses.data ?? [];
  const list = all.filter((c) => c.status === filter);
  const countOf = (s: Filter) => all.filter((c) => c.status === s).length;

  return (
    <div>
      <PageHeader
        eyebrow="Platform admin"
        title="Course reviews"
        description="Inspect submitted courses, approve or return them with comments, then publish approved courses to the catalog."
      />
      <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)} className="mb-6">
        <TabsList>
          {(["pending", "approved", "published", "rejected", "draft"] as Filter[]).map((s) => (
            <TabsTrigger key={s} value={s} className="capitalize">
              {s === "pending" ? "To review" : s} ({countOf(s)})
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {courses.isLoading ? (
        <Loading />
      ) : list.length === 0 ? (
        <EmptyState title="Nothing here" />
      ) : (
        <div className="grid gap-4">
          {list.map((c) => (
            <div key={c.id} className="pop-card p-5">
              <div className="mb-2 flex flex-wrap gap-1.5">
                <StatusPill status={c.status} />
                <Pill>{c.grade_levels?.name ?? "No grade"}</Pill>
                <Pill>{c.subjects?.name ?? "No subject"}</Pill>
                <Pill>{MODE_LABEL[c.delivery_mode]}</Pill>
                <Pill>{money(c.price, c.currency)}</Pill>
                {c.status === "published" && !c.is_visible && <Pill tone="coral">Hidden</Pill>}
              </div>
              <h3 className="font-display text-lg font-bold">{c.title}</h3>
              <p className="text-sm text-muted-foreground">
                by {c.instructor?.full_name ?? "unassigned"} ·{" "}
                {c.submitted_at
                  ? `submitted ${ago(c.submitted_at)}`
                  : `updated ${ago(c.updated_at)}`}
              </p>
              {c.summary && <p className="mt-2 text-sm">{c.summary}</p>}
              {c.review_comment && (
                <p className="mt-2 rounded-lg border-2 border-border bg-muted p-2 text-sm">
                  <b>Last review comment:</b> {c.review_comment}
                </p>
              )}

              <div className="mt-4 flex flex-wrap items-start gap-2">
                <Button size="sm" variant="outline" onClick={() => setInspect(c.id)}>
                  Inspect content
                </Button>
                {(c.status === "pending" || c.status === "approved") && (
                  <>
                    <Textarea
                      rows={1}
                      className="min-w-64 flex-1"
                      placeholder="Review comment (required to reject)"
                      value={comments[c.id] ?? ""}
                      onChange={(e) => setComments({ ...comments, [c.id]: e.target.value })}
                    />
                    {c.status === "pending" && (
                      <Button size="sm" onClick={() => approve(c.id)}>
                        Approve
                      </Button>
                    )}
                    {c.status === "approved" && (
                      <Button
                        size="sm"
                        onClick={() => update(c.id, { status: "published" }, "Course published")}
                      >
                        Publish
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => reject(c.id)}>
                      Reject
                    </Button>
                  </>
                )}
                {c.status === "published" && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        update(
                          c.id,
                          { is_visible: !c.is_visible },
                          c.is_visible ? "Hidden from catalog" : "Visible in catalog",
                        )
                      }
                    >
                      {c.is_visible ? "Hide from catalog" : "Show in catalog"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        window.confirm(
                          "Unpublish this course? New purchases stop; enrolled students keep their enrollment.",
                        ) && update(c.id, { status: "approved" }, "Course unpublished")
                      }
                    >
                      Unpublish
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!inspect} onOpenChange={(o) => !o && setInspect(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Course content</DialogTitle>
          </DialogHeader>
          {inspect && <Outline courseId={inspect} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Outline({ courseId }: { courseId: string }) {
  const outline = useQuery(courseOutlineQuery(courseId));
  const assess = useQuery(courseAssessmentsQuery(courseId));
  if (outline.isLoading || assess.isLoading) return <Loading />;
  const { modules = [], lessons = [] } = outline.data ?? {};
  const { assessments = [], questions = [] } = assess.data ?? {};
  if (modules.length === 0 && assessments.length === 0)
    return <EmptyState title="This course has no content yet" />;
  return (
    <div className="grid gap-5 text-sm">
      {modules.map((m) => (
        <div key={m.id}>
          <p className="font-display font-bold">{m.title}</p>
          <ul className="mt-1 grid gap-1.5">
            {lessons
              .filter((l) => l.module_id === m.id)
              .map((l) => (
                <li key={l.id} className="rounded-lg border-2 border-border p-2">
                  <p className="font-semibold">
                    {l.title}{" "}
                    {l.duration_min ? (
                      <span className="font-normal text-muted-foreground">
                        · {l.duration_min} min
                      </span>
                    ) : null}
                  </p>
                  {l.content && <p className="line-clamp-2 text-muted-foreground">{l.content}</p>}
                  <div className="mt-1 flex gap-3">
                    {l.video_url && (
                      <a
                        className="text-teal underline"
                        href={l.video_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Video
                      </a>
                    )}
                    {l.document_url && (
                      <a
                        className="text-teal underline"
                        href={l.document_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Document
                      </a>
                    )}
                  </div>
                </li>
              ))}
          </ul>
        </div>
      ))}
      {assessments.length > 0 && (
        <div>
          <p className="font-display font-bold">Assessments</p>
          <ul className="mt-1 grid gap-1.5">
            {assessments.map((a) => {
              const qs = questions.filter((q) => q.assessment_id === a.id);
              return (
                <li key={a.id} className="rounded-lg border-2 border-border p-2">
                  <p className="font-semibold capitalize">
                    {a.title}{" "}
                    <span className="font-normal text-muted-foreground">
                      · {a.kind} · pass mark {a.pass_mark}%
                    </span>
                  </p>
                  <p className="text-muted-foreground">
                    {qs.length} questions ({qs.filter((q) => q.kind === "written").length} written,
                    marked by hand)
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
