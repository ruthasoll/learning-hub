import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarPlus, ClipboardList, ExternalLink, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { unwrap } from "@/lib/session";
import { act } from "@/lib/actions";
import { courseRosterQuery } from "@/lib/teach";
import { dateTime } from "@/lib/format";
import { EmptyState, Loading, Pill } from "@/components/ui-kit";
import { Field } from "@/components/admin-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Status = "present" | "absent" | "late";

export function CourseLive({ courseId }: { courseId: string }) {
  const qc = useQueryClient();
  const sessions = useQuery({
    queryKey: ["teach-sessions", courseId],
    queryFn: async () => {
      const [s, a] = await Promise.all([
        supabase.from("live_sessions").select("*").eq("course_id", courseId).order("starts_at", { ascending: false }),
        supabase.from("attendance").select("*").eq("course_id", courseId),
      ]);
      return { sessions: unwrap(s), attendance: unwrap(a) };
    },
  });
  const roster = useQuery(courseRosterQuery(courseId));
  const [form, setForm] = useState<{ title: string; starts_at: string; duration_min: string; meeting_url: string; notes: string } | null>(null);
  const [marking, setMarking] = useState<string | null>(null);
  const [marks, setMarks] = useState<Record<string, Status>>({});
  const refresh = () => qc.invalidateQueries({ queryKey: ["teach-sessions", courseId] });

  async function schedule() {
    if (!form) return;
    const ok = await act(
      supabase.from("live_sessions").insert({
        course_id: courseId,
        title: form.title.trim(),
        starts_at: new Date(form.starts_at).toISOString(),
        duration_min: Number(form.duration_min) || 45,
        meeting_url: form.meeting_url.trim() || null,
        notes: form.notes || null,
      }),
      "Class scheduled — students and parents were notified",
    );
    if (ok) {
      setForm(null);
      await refresh();
    }
  }
  async function remove(id: string) {
    if (!window.confirm("Cancel this class?")) return;
    if (await act(supabase.from("live_sessions").delete().eq("id", id), "Class removed")) await refresh();
  }
  function openAttendance(id: string) {
    const existing = (sessions.data?.attendance ?? []).filter((x) => x.session_id === id);
    const m: Record<string, Status> = {};
    for (const e of roster.data?.enrollments ?? []) m[e.student_id] = (existing.find((x) => x.student_id === e.student_id)?.status as Status) ?? "present";
    setMarks(m);
    setMarking(id);
  }
  async function saveAttendance() {
    if (!marking) return;
    const rows = Object.entries(marks).map(([student_id, status]) => ({ session_id: marking, student_id, course_id: courseId, status }));
    if (rows.length && (await act(supabase.from("attendance").upsert(rows), "Attendance saved"))) {
      setMarking(null);
      await refresh();
    }
  }

  if (sessions.isLoading) return <Loading />;
  const list = sessions.data?.sessions ?? [];
  const activeStudents = (roster.data?.enrollments ?? []).filter((e) => e.status === "active");

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Classes run on your meeting tool (Zoom, Google Meet…). Paste the link and students will see a Join button.</p>
        <Button onClick={() => setForm({ title: "", starts_at: "", duration_min: "45", meeting_url: "", notes: "" })}><CalendarPlus /> Schedule class</Button>
      </div>
      {list.length === 0 ? (
        <EmptyState title="No classes scheduled" description="Schedule guided lessons or optional live help sessions." />
      ) : (
        <div className="grid gap-3">
          {list.map((s) => {
            const att = (sessions.data?.attendance ?? []).filter((x) => x.session_id === s.id);
            const upcoming = new Date(s.starts_at) > new Date();
            return (
              <div key={s.id} className="pop-card flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <div className="mb-1 flex gap-1.5">
                    <Pill tone={upcoming ? "sun" : "neutral"}>{upcoming ? "upcoming" : "past"}</Pill>
                    {att.length > 0 && <Pill tone="teal">{att.filter((x) => x.status !== "absent").length}/{att.length} attended</Pill>}
                  </div>
                  <p className="font-semibold">{s.title}</p>
                  <p className="text-xs text-muted-foreground">{dateTime(s.starts_at)} · {s.duration_min} min</p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {s.meeting_url && <Button size="sm" variant="outline" asChild><a href={s.meeting_url} target="_blank" rel="noreferrer"><ExternalLink /> Open link</a></Button>}
                  <Button size="sm" variant="outline" onClick={() => openAttendance(s.id)} disabled={activeStudents.length === 0}><ClipboardList /> Attendance</Button>
                  <Button size="icon" variant="ghost" aria-label="Remove class" onClick={() => remove(s.id)}><Trash2 /></Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Schedule a class</DialogTitle></DialogHeader>
          {form && (
            <div className="grid gap-4">
              <Field label="Title"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Starts"><Input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} /></Field>
                <Field label="Length (minutes)"><Input type="number" min={5} value={form.duration_min} onChange={(e) => setForm({ ...form, duration_min: e.target.value })} /></Field>
              </div>
              <Field label="Meeting link"><Input placeholder="https://zoom.us/j/…" value={form.meeting_url} onChange={(e) => setForm({ ...form, meeting_url: e.target.value })} /></Field>
              <Field label="Notes for students"><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
            </div>
          )}
          <DialogFooter><Button onClick={schedule} disabled={!form?.title.trim() || !form?.starts_at}>Schedule</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!marking} onOpenChange={(o) => !o && setMarking(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Attendance</DialogTitle></DialogHeader>
          <div className="grid max-h-[60vh] gap-2 overflow-y-auto">
            {activeStudents.map((e) => (
              <div key={e.student_id} className="flex items-center justify-between gap-2">
                <span className="font-medium">{e.student?.full_name ?? "Student"}</span>
                <Select value={marks[e.student_id] ?? "present"} onValueChange={(v) => setMarks({ ...marks, [e.student_id]: v as Status })}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="present">Present</SelectItem><SelectItem value="late">Late</SelectItem><SelectItem value="absent">Absent</SelectItem></SelectContent>
                </Select>
              </div>
            ))}
          </div>
          <DialogFooter><Button onClick={saveAttendance}>Save attendance</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
