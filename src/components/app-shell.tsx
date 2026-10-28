import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  BookOpen,
  ClipboardCheck,
  CreditCard,
  GraduationCap,
  Home,
  LayoutDashboard,
  LibraryBig,
  LogOut,
  Megaphone,
  Menu,
  MessageSquare,
  Percent,
  Receipt,
  ScrollText,
  Settings,
  ShieldCheck,
  Tags,
  Undo2,
  UserCircle,
  Users,
  HeartHandshake,
  School,
  LifeBuoy,
  Wallet,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ROLE_LABEL, useMe, type Role } from "@/lib/session";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { Onboarding } from "@/components/onboarding";

type NavItem = { to: string; label: string; icon: ReactNode; exact?: boolean };
type NavGroup = { label: string; roles: Role[] | "all"; items: NavItem[] };

const NAV: NavGroup[] = [
  {
    label: "Learning",
    roles: ["student"],
    items: [
      { to: "/learn", label: "My learning", icon: <GraduationCap />, exact: true },
      { to: "/catalog", label: "Course catalog", icon: <LibraryBig /> },
    ],
  },
  {
    label: "Family",
    roles: ["parent"],
    items: [
      { to: "/family", label: "Family dashboard", icon: <HeartHandshake /> },
      { to: "/catalog", label: "Course catalog", icon: <LibraryBig /> },
    ],
  },
  {
    label: "Teaching",
    roles: ["instructor"],
    items: [
      { to: "/teach", label: "My courses", icon: <BookOpen />, exact: true },
      { to: "/teach/grading", label: "Grading", icon: <ClipboardCheck /> },
      { to: "/teach/students", label: "Student support", icon: <LifeBuoy /> },
    ],
  },
  {
    label: "Platform admin",
    roles: ["platform_admin"],
    items: [
      { to: "/admin", label: "Overview", icon: <LayoutDashboard />, exact: true },
      { to: "/admin/reviews", label: "Course reviews", icon: <ShieldCheck /> },
      { to: "/admin/users", label: "Users & roles", icon: <Users /> },
      { to: "/admin/academics", label: "Academic structure", icon: <School /> },
      { to: "/admin/parents", label: "Family links", icon: <HeartHandshake /> },
      { to: "/admin/settings", label: "Settings", icon: <Settings /> },
      { to: "/admin/audit", label: "Audit log", icon: <ScrollText /> },
    ],
  },
  {
    label: "Finance",
    roles: ["finance_admin"],
    items: [
      { to: "/finance", label: "Finance overview", icon: <Wallet />, exact: true },
      { to: "/finance/pricing", label: "Pricing", icon: <Tags /> },
      { to: "/finance/coupons", label: "Discounts", icon: <Percent /> },
      { to: "/finance/transactions", label: "Transactions", icon: <Receipt /> },
      { to: "/finance/refunds", label: "Refunds", icon: <Undo2 /> },
    ],
  },
  {
    label: "Everyone",
    roles: "all",
    items: [
      { to: "/messages", label: "Messages", icon: <MessageSquare /> },
      { to: "/announcements", label: "Announcements", icon: <Megaphone /> },
      { to: "/payments", label: "Payments", icon: <CreditCard /> },
      { to: "/profile", label: "Profile", icon: <UserCircle /> },
    ],
  },
];

function NavLinks({ roles, onNavigate }: { roles: Role[]; onNavigate?: () => void }) {
  const groups = NAV.filter((g) => g.roles === "all" || g.roles.some((r) => roles.includes(r)));
  return (
    <nav className="flex flex-col gap-6">
      {groups.map((g) => (
        <div key={g.label}>
          <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.16em] text-sidebar-foreground/50">
            {g.label}
          </p>
          <ul className="flex flex-col gap-0.5">
            {g.items.map((item) => (
              <li key={item.to + g.label}>
                <Link
                  to={item.to}
                  onClick={onNavigate}
                  activeOptions={{ exact: item.exact ?? false }}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/85 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground [&_svg]:size-4"
                  activeProps={{
                    className:
                      "!bg-sidebar-primary !text-sidebar-primary-foreground font-semibold",
                  }}
                >
                  {item.icon}
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function useUnreadCount(userId: string) {
  return useQuery({
    queryKey: ["notifications", "unread", userId],
    queryFn: async () => {
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .is("read_at", null);
      return count ?? 0;
    },
    refetchInterval: 30_000,
  });
}

export function AppShell({ children }: { children: ReactNode }) {
  const me = useMe();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const unread = useUnreadCount(me.id);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const name = me.profile?.full_name || me.email || "You";
  const learningRoles = me.roles.filter((r) => r !== "platform_admin" && r !== "finance_admin");
  const needsOnboarding =
    learningRoles.length === 0 && !me.profile?.requested_role && me.roles.length === 0;
  const awaitingInstructor =
    me.profile?.requested_role === "instructor" && !me.roles.includes("instructor");

  let body: ReactNode = children;
  if (me.profile && !me.profile.is_active) {
    body = (
      <div className="pop-card mx-auto mt-10 max-w-lg p-8 text-center">
        <h1 className="font-display text-2xl font-bold">Your account is paused</h1>
        <p className="mt-2 text-muted-foreground">
          A platform administrator has deactivated this account. Please contact your school.
        </p>
      </div>
    );
  } else if (needsOnboarding) {
    body = <Onboarding />;
  } else if (awaitingInstructor && me.roles.length === 0) {
    body = (
      <div className="pop-card mx-auto mt-10 max-w-lg p-8 text-center">
        <h1 className="font-display text-2xl font-bold">Thanks for applying to teach</h1>
        <p className="mt-2 text-muted-foreground">
          A platform administrator will review your instructor request. You'll get access to
          course tools as soon as it's approved.
        </p>
      </div>
    );
  }

  const sidebar = (
    <div className="flex h-full flex-col gap-6 p-5">
      <Brand inverted />
      <div className="rounded-xl bg-sidebar-accent p-3">
        <p className="truncate text-sm font-semibold text-sidebar-accent-foreground">{name}</p>
        <p className="mt-0.5 truncate text-xs text-sidebar-foreground/60">
          {me.roles.map((r) => ROLE_LABEL[r]).join(" · ") || "Setting up"}
        </p>
      </div>
      <div className="flex-1 overflow-y-auto pr-1">
        <NavLinks roles={me.roles} onNavigate={() => setOpen(false)} />
      </div>
      <button
        onClick={signOut}
        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent"
      >
        <LogOut className="size-4" /> Sign out
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-64 bg-sidebar lg:block">{sidebar}</aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b-2 border-ink bg-background/95 px-4 backdrop-blur md:px-8">
          <div className="flex items-center gap-2">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="lg:hidden" aria-label="Open menu">
                  <Menu />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 border-r-0 bg-sidebar p-0">
                {sidebar}
              </SheetContent>
            </Sheet>
            <Link
              to="/dashboard"
              className="hidden items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground sm:flex"
            >
              <Home className="size-4" /> Home
            </Link>
          </div>
          <Link
            to="/notifications"
            className="relative inline-flex size-10 items-center justify-center rounded-lg border-2 border-ink bg-card hover:bg-accent"
            aria-label="Notifications"
          >
            <Bell className="size-4" />
            {(unread.data ?? 0) > 0 && (
              <span className="absolute -right-2 -top-2 flex min-w-5 items-center justify-center rounded-full border-2 border-ink bg-sun px-1 text-[10px] font-bold text-sun-foreground">
                {unread.data}
              </span>
            )}
          </Link>
        </header>
        <main className={cn("mx-auto w-full max-w-6xl px-4 py-8 md:px-8")}>{body}</main>
      </div>
    </div>
  );
}
