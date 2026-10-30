import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Bell, CalendarClock, CheckCheck, Megaphone, MessageSquare, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe, unwrap } from "@/lib/session";
import { act } from "@/lib/actions";
import { ago } from "@/lib/format";
import { EmptyState, Loading, PageHeader } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({ meta: [{ title: "Notifications — Brightpath" }] }),
  component: NotificationsPage,
});

const ICON: Record<string, React.ReactNode> = {
  alert: <AlertTriangle className="size-5 text-coral" />,
  message: <MessageSquare className="size-5 text-teal" />,
  announcement: <Megaphone className="size-5 text-coral" />,
  session: <CalendarClock className="size-5 text-teal" />,
};

function NotificationsPage() {
  const me = useMe();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["notifications", "list", me.id],
    queryFn: async () =>
      unwrap(await supabase.from("notifications").select("*").eq("user_id", me.id).order("created_at", { ascending: false }).limit(200)),
  });

  async function refresh() {
    await qc.invalidateQueries({ queryKey: ["notifications"] });
  }
  async function markAll() {
    if (await act(supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", me.id).is("read_at", null), "All caught up"))
      await refresh();
  }
  async function markRead(id: string) {
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
    await refresh();
  }
  async function remove(id: string) {
    if (await act(supabase.from("notifications").delete().eq("id", id))) await refresh();
  }

  const unread = (q.data ?? []).filter((n) => !n.read_at).length;

  return (
    <div>
      <PageHeader
        eyebrow="Notifications"
        title="What's new"
        description={`${unread} unread`}
        actions={<Button variant="outline" onClick={markAll} disabled={!unread}><CheckCheck /> Mark all read</Button>}
      />
      {q.isLoading ? (
        <Loading />
      ) : (q.data ?? []).length === 0 ? (
        <EmptyState icon={<Bell className="size-8" />} title="No notifications yet" />
      ) : (
        <ul className="grid gap-2">
          {q.data!.map((n) => (
            <li key={n.id} className={cn("pop-card-flat flex items-start gap-3 p-4", !n.read_at && "bg-sun-soft")}>
              <span className="mt-0.5">{ICON[n.kind] ?? <Bell className="size-5 text-muted-foreground" />}</span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{n.title}</p>
                {n.body && <p className="text-sm text-muted-foreground">{n.body}</p>}
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span>{ago(n.created_at)}</span>
                  {n.link && n.link.startsWith("/") && (
                    <Link to={n.link} onClick={() => markRead(n.id)} className="font-semibold text-foreground underline-offset-2 hover:underline">
                      Open
                    </Link>
                  )}
                  {!n.read_at && (
                    <button onClick={() => markRead(n.id)} className="font-semibold hover:underline">Mark read</button>
                  )}
                </div>
              </div>
              <Button size="icon" variant="ghost" aria-label="Delete" onClick={() => remove(n.id)}><Trash2 /></Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
