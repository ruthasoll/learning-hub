import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Pencil, Plus, Trash2, Video } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/lib/session";
import { act } from "@/lib/actions";
import { courseOutlineQuery } from "@/lib/teach";
import { EmptyState, Loading } from "@/components/ui-kit";
import { Field } from "@/components/admin-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Lesson = Tables<"lessons">;
type Draft = { id?: string; module_id: string; title: string; content: string; video_url: string; document_url: string; duration_min: string };

export function CourseContent({ courseId }: { courseId: string }) {
  const qc = useQueryClient();
  const outline = useQuery(courseOutlineQuery(courseId));
  const [newModule, setNewModule] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ["teach-outline", courseId] });

  if (outline.isLoading) return <Loading />;
  const modules = outline.data?.modules ?? [];
  const lessons = outline.data?.lessons ?? [];

  async function addModule() {
    const ok = await act(
      supabase.from("modules").insert({ course_id: courseId, title: newModule.trim(), position: modules.length + 1 }),
      "Module added",
    );
    if (ok) {
      setNewModule("");
      await refresh();
    }
  }
  async function renameModule(id: string, current: string) {
    const title = window.prompt("Module name", current);
    if (!title?.trim()) return;
    if (await act(supabase.from("modules").update({ title: title.trim() }).eq("id", id))) await refresh();
  }
  async function deleteModule(id: string) {
    if (!window.confirm("Delete this module and all its lessons?")) return;
    if (await act(supabase.from("modules").delete().eq("id", id), "Module deleted")) await refresh();
  }
  async function deleteLesson(id: string) {
    if (!window.confirm("Delete this lesson?")) return;
    if (await act(supabase.from("lessons").delete().eq("id", id), "Lesson deleted")) await refresh();
  }
  function edit(l: Lesson) {
    setDraft({ id: l.id, module_id: l.module_id, title: l.title, content: l.content, video_url: l.video_url ?? "", document_url: l.document_url ?? "", duration_min: l.duration_min?.toString() ?? "" });
  }
  async function saveLesson() {
    if (!draft) return;
    const row = {
      title: draft.title.trim(),
      content: draft.content,
      video_url: draft.video_url.trim() || null,
      document_url: draft.document_url.trim() || null,
      duration_min: draft.duration_min ? Number(draft.duration_min) : null,
    };
    const ok = draft.id
      ? await act(supabase.from("lessons").update(row).eq("id", draft.id), "Lesson saved")
      : await act(
          supabase.from("lessons").insert({ ...row, course_id: courseId, module_id: draft.module_id, position: lessons.filter((l) => l.module_id === draft.module_id).length + 1 }),
          "Lesson added",
        );
    if (ok) {
      setDraft(null);
      await refresh();
    }
  }

  return (
    <div className="grid gap-5">
      {modules.length === 0 && <EmptyState title="No modules yet" description="Modules group your lessons into units, like “Week 1” or “Fractions”." />}
      {modules.map((m) => (
        <div key={m.id} className="pop-card p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="font-display text-lg font-bold">{m.title}</h3>
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" aria-label="Rename module" onClick={() => renameModule(m.id, m.title)}><Pencil /></Button>
              <Button size="icon" variant="ghost" aria-label="Delete module" onClick={() => deleteModule(m.id)}><Trash2 /></Button>
            </div>
          </div>
          <ul className="grid gap-2">
            {lessons.filter((l) => l.module_id === m.id).map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-2 rounded-lg border-2 border-border bg-background p-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{l.title}</p>
                  <p className="flex items-center gap-2 text-xs text-muted-foreground">
                    {l.duration_min ? `${l.duration_min} min` : "No duration"}
                    {l.video_url && <span className="inline-flex items-center gap-1"><Video className="size-3" /> video</span>}
                    {l.document_url && <span className="inline-flex items-center gap-1"><FileText className="size-3" /> document</span>}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button size="sm" variant="outline" onClick={() => edit(l)}><Pencil /> Edit</Button>
                  <Button size="icon" variant="ghost" aria-label="Delete lesson" onClick={() => deleteLesson(l.id)}><Trash2 /></Button>
                </div>
              </li>
            ))}
          </ul>
          <Button size="sm" variant="outline" className="mt-3" onClick={() => setDraft({ module_id: m.id, title: "", content: "", video_url: "", document_url: "", duration_min: "" })}>
            <Plus /> Add lesson
          </Button>
        </div>
      ))}
      <div className="flex gap-2">
        <Input placeholder="New module name" value={newModule} onChange={(e) => setNewModule(e.target.value)} className="max-w-sm" />
        <Button onClick={addModule} disabled={!newModule.trim()}><Plus /> Add module</Button>
      </div>

      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{draft?.id ? "Edit lesson" : "New lesson"}</DialogTitle></DialogHeader>
          {draft && (
            <div className="grid gap-4">
              <Field label="Title"><Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></Field>
              <Field label="Lesson text / activity"><Textarea rows={6} value={draft.content} onChange={(e) => setDraft({ ...draft, content: e.target.value })} /></Field>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Video link" hint="YouTube or Vimeo links play inside the lesson."><Input value={draft.video_url} onChange={(e) => setDraft({ ...draft, video_url: e.target.value })} /></Field>
                <Field label="Document link" hint="Worksheet, PDF or slides."><Input value={draft.document_url} onChange={(e) => setDraft({ ...draft, document_url: e.target.value })} /></Field>
              </div>
              <Field label="Duration (minutes)"><Input type="number" min={0} value={draft.duration_min} onChange={(e) => setDraft({ ...draft, duration_min: e.target.value })} className="max-w-32" /></Field>
            </div>
          )}
          <DialogFooter><Button onClick={saveLesson} disabled={!draft?.title.trim()}>Save lesson</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
