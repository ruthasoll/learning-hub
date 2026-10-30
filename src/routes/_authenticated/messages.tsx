import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ROLE_LABEL, useMe, unwrap, type Role } from "@/lib/session";
import { act } from "@/lib/actions";
import { ago, dateTime, initials } from "@/lib/format";
import { EmptyState, Loading, PageHeader } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/messages")({
  validateSearch: (s: Record<string, unknown>): { to?: string } => (typeof s["to"] === "string" ? { to: s["to"] } : {}),
  head: () => ({ meta: [{ title: "Messages — Brightpath" }] }),
  component: MessagesPage,
});

function MessagesPage() {
  const me = useMe();
  const qc = useQueryClient();
  const navigate = useNavigate({ from: "/messages" });
  const { to } = Route.useSearch();
  const [body, setBody] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const contacts = useQuery({
    queryKey: ["message-contacts", me.id],
    queryFn: async () => unwrap(await supabase.rpc("message_contacts")),
  });
  const messages = useQuery({
    queryKey: ["messages", me.id],
    queryFn: async () =>
      unwrap(
        await supabase
          .from("messages")
          .select("*")
          .or(`sender_id.eq.${me.id},recipient_id.eq.${me.id}`)
          .order("created_at", { ascending: true })
          .limit(1000),
      ),
    refetchInterval: 15_000,
  });

  const otherIds = useMemo(
    () => Array.from(new Set((messages.data ?? []).map((m) => (m.sender_id === me.id ? m.recipient_id : m.sender_id)))),
    [messages.data, me.id],
  );
  const names = useQuery({
    queryKey: ["profile-names", otherIds.join(",")],
    enabled: otherIds.length > 0,
    queryFn: async () => unwrap(await supabase.from("profiles").select("id, full_name").in("id", otherIds)),
  });
  const nameOf = (id: string) =>
    names.data?.find((p) => p.id === id)?.full_name ?? contacts.data?.find((c) => c.id === id)?.full_name ?? "User";
  const rolesOf = (id: string) =>
    (contacts.data?.find((c) => c.id === id)?.roles ?? []).map((r) => ROLE_LABEL[r as Role] ?? r).join(" · ");

  const threads = otherIds
    .map((id) => {
      const msgs = (messages.data ?? []).filter((m) => m.sender_id === id || m.recipient_id === id);
      const last = msgs[msgs.length - 1]!;
      const unread = msgs.filter((m) => m.recipient_id === me.id && !m.read_at).length;
      return { id, last, unread };
    })
    .sort((a, b) => b.last.created_at.localeCompare(a.last.created_at));

  const activeId = to ?? threads[0]?.id;
  const thread = (messages.data ?? []).filter((m) => m.sender_id === activeId || m.recipient_id === activeId);
  const canSend = !!activeId && (contacts.data?.some((c) => c.id === activeId) ?? false);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
    const unread = thread.filter((m) => m.recipient_id === me.id && !m.read_at).map((m) => m.id);
    if (unread.length) {
      void supabase
        .from("messages")
        .update({ read_at: new Date().toISOString() })
        .in("id", unread)
        .then(() => qc.invalidateQueries({ queryKey: ["messages"] }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, thread.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!activeId || !body.trim()) return;
    const ok = await act(supabase.from("messages").insert({ sender_id: me.id, recipient_id: activeId, body: body.trim().slice(0, 4000) }));
    if (ok) {
      setBody("");
      await qc.invalidateQueries({ queryKey: ["messages"] });
    }
  }

  const newContacts = (contacts.data ?? []).filter((c) => !otherIds.includes(c.id));

  return (
    <div>
      <PageHeader eyebrow="Messages" title="Conversations" description="Message teachers, students, parents and administrators you're connected with." />
      {messages.isLoading ? (
        <Loading />
      ) : (
        <div className="pop-card grid min-h-[560px] overflow-hidden md:grid-cols-[280px_1fr]">
          <aside className="border-b-2 border-ink md:border-b-0 md:border-r-2">
            <div className="border-b-2 border-ink p-3">
              <Select value="" onValueChange={(v) => navigate({ search: { to: v } })}>
                <SelectTrigger className="border-2 bg-card"><SelectValue placeholder="Start a new conversation" /></SelectTrigger>
                <SelectContent>
                  {newContacts.length === 0 && <div className="p-2 text-xs text-muted-foreground">No new contacts</div>}
                  {newContacts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.full_name} <span className="text-muted-foreground">· {c.roles.map((r) => ROLE_LABEL[r as Role] ?? r).join(", ")}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <ul className="max-h-[480px] overflow-y-auto">
              {to && !threads.some((t) => t.id === to) && (
                <li className="flex items-center gap-3 bg-sun-soft p-3">
                  <Avatar name={nameOf(to)} />
                  <span className="text-sm font-semibold">{nameOf(to)}</span>
                </li>
              )}
              {threads.map((t) => (
                <li key={t.id}>
                  <button
                    onClick={() => navigate({ search: { to: t.id } })}
                    className={cn("flex w-full items-center gap-3 p-3 text-left hover:bg-accent", activeId === t.id && "bg-sun-soft")}
                  >
                    <Avatar name={nameOf(t.id)} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold">{nameOf(t.id)}</span>
                        <span className="shrink-0 text-[10px] text-muted-foreground">{ago(t.last.created_at)}</span>
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">{t.last.body}</span>
                    </span>
                    {t.unread > 0 && <span className="rounded-full bg-coral px-1.5 text-[10px] font-bold text-coral-foreground">{t.unread}</span>}
                  </button>
                </li>
              ))}
            </ul>
          </aside>
          <section className="flex flex-col">
            {!activeId ? (
              <div className="flex flex-1 items-center justify-center p-6">
                <EmptyState icon={<MessageSquare className="size-8" />} title="No conversations yet" description="Choose someone above to start a conversation." />
              </div>
            ) : (
              <>
                <header className="border-b-2 border-ink p-4">
                  <p className="font-bold">{nameOf(activeId)}</p>
                  <p className="text-xs text-muted-foreground">{rolesOf(activeId)}</p>
                </header>
                <div className="flex-1 space-y-3 overflow-y-auto p-4" style={{ maxHeight: 420 }}>
                  {thread.length === 0 && <p className="text-center text-sm text-muted-foreground">Say hello 👋</p>}
                  {thread.map((m) => (
                    <div key={m.id} className={cn("flex", m.sender_id === me.id ? "justify-end" : "justify-start")}>
                      <div className={cn("max-w-[75%] rounded-2xl border-2 border-ink px-4 py-2 text-sm", m.sender_id === me.id ? "bg-teal text-teal-foreground" : "bg-card")}>
                        <p className="whitespace-pre-line">{m.body}</p>
                        <p className="mt-1 text-[10px] opacity-70">{dateTime(m.created_at)}</p>
                      </div>
                    </div>
                  ))}
                  <div ref={endRef} />
                </div>
                {canSend ? (
                  <form onSubmit={send} className="flex gap-2 border-t-2 border-ink p-3">
                    <Textarea
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      placeholder="Write a message…"
                      className="min-h-11 flex-1 resize-none"
                      rows={1}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          void send(e);
                        }
                      }}
                    />
                    <Button type="submit" variant="hero" disabled={!body.trim()} aria-label="Send"><Send /></Button>
                  </form>
                ) : (
                  <p className="border-t-2 border-ink p-3 text-center text-xs text-muted-foreground">You can't send messages to this person.</p>
                )}
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function Avatar({ name }: { name: string }) {
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-sun-soft text-xs font-bold">
      {initials(name)}
    </span>
  );
}
