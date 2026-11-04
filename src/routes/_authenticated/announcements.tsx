import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Megaphone, Send, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe, unwrap } from "@/lib/session";
import { act } from "@/lib/actions";
import { ago, dateTime } from "@/lib/format";
import { EmptyState, Loading, PageHeader, Pill, Section } from "@/components/ui-kit";
import { Field, NONE, fromSel } from "@/components/admin-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/announcements")({
  head: () => ({ meta: [{ title: "Announcements — Brightpath" }] }),
  component: AnnouncementsPage,
});

const AUDIENCE = { all: "Everyone", students: "Students", parents: "Parents" } as const;

function AnnouncementsPage() {
  const me = useMe();
  const qc = useQueryClient();
  const isAdmin = me.roles.includes("platform_admin");
  const isInstructor = me.roles.includes("instructor");
  const canPost = isAdmin || isInstructor;

  const list = useQuery({
    queryKey: ["announcements"],
    queryFn: async () =>
      unwrap(
        await supabase
          .from("announcements")
          .select("*, courses(title), author:profiles!announcements_author_id_fkey(full_name)")
          .order("created_at", { ascending: false })
          .limit(200),
      ),
  });
  const myCourses = useQuery({
    queryKey: ["my-teaching-courses", me.id],
    enabled: canPost,
    queryFn: async () => {
      let q = supabase.from("courses").select("id, title").order("title");
      if (!isAdmin) q = q.eq("instructor_id", me.id);
      return unwrap(await q);
    },
  });

  const [course, setCourse] = useState<string>(isAdmin ? NONE : "");
  const [audience, setAudience] = useState<keyof typeof AUDIENCE>("all");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  async function post() {
    const courseId = fromSel(course);
    if (!isAdmin && !courseId) return;
    const ok = await act(
      supabase.from("announcements").insert({ title: title.trim(), body: body.trim(), audience, course_id: courseId || null, author_id: me.id }),
      "Announcement posted and notifications sent",
    );
    if (ok) {
      setTitle("");
      setBody("");
      await qc.invalidateQueries({ queryKey: ["announcements"] });
    }
  }

  async function remove(id: string) {
    if (await act(supabase.from("announcements").delete().eq("id", id), "Announcement removed"))
      await qc.invalidateQueries({ queryKey: ["announcements"] });
  }

  return (
    <div>
      <PageHeader eyebrow="Announcements" title="News & updates" description="School-wide news and updates from your courses." />

      {canPost && (
        <Section title="Post an announcement">
          <div className="pop-card grid gap-4 p-6 md:grid-cols-2">
            <Field label="Course">
              <Select value={course} onValueChange={setCourse}>
                <SelectTrigger><SelectValue placeholder="Choose a course" /></SelectTrigger>
                <SelectContent>
                  {isAdmin && <SelectItem value={NONE}>Whole platform</SelectItem>}
                  {(myCourses.data ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Who should see it">
              <Select value={audience} onValueChange={(v) => setAudience(v as keyof typeof AUDIENCE)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(AUDIENCE).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <div className="md:col-span-2"><Field label="Title"><Input value={title} onChange={(e) => setTitle(e.target.value)} /></Field></div>
            <div className="md:col-span-2"><Field label="Message"><Textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} /></Field></div>
            <div className="md:col-span-2">
              <Button onClick={post} disabled={!title.trim() || (!isAdmin && !course)}><Send /> Post</Button>
            </div>
          </div>
        </Section>
      )}

      <Section title="Latest">
        {list.isLoading ? (
          <Loading />
        ) : !list.data?.length ? (
          <EmptyState icon={<Megaphone className="size-8" />} title="No announcements yet" description="When your school or teachers post news, it shows up here." />
        ) : (
          <div className="grid gap-4">
            {list.data.map((a) => (
              <article key={a.id} className="pop-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="mb-1 flex flex-wrap gap-1.5">
                      <Pill tone={a.course_id ? "teal" : "sun"}>{a.courses?.title ?? "Whole platform"}</Pill>
                      <Pill>{AUDIENCE[a.audience as keyof typeof AUDIENCE] ?? a.audience}</Pill>
                    </div>
                    <h3 className="font-display text-lg font-bold">{a.title}</h3>
                    <p className="text-xs text-muted-foreground" title={dateTime(a.created_at)}>
                      {a.author?.full_name ?? "Staff"} · {ago(a.created_at)}
                    </p>
                  </div>
                  {(a.author_id === me.id || isAdmin) && (
                    <Button size="icon" variant="ghost" aria-label="Delete announcement" onClick={() => remove(a.id)}><Trash2 /></Button>
                  )}
                </div>
                {a.body && <p className="mt-3 whitespace-pre-wrap text-sm">{a.body}</p>}
              </article>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
