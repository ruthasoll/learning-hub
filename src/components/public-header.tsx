import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";

export function useSignedIn() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, session) => setSignedIn(!!session));
    return () => data.subscription.unsubscribe();
  }, []);
  return signedIn;
}

export function PublicHeader() {
  const signedIn = useSignedIn();
  return (
    <header className="sticky top-0 z-30 border-b-2 border-ink bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-8">
        <Brand />
        <nav className="flex items-center gap-1 sm:gap-3">
          <Link
            to="/catalog"
            className="rounded-lg px-3 py-2 text-sm font-semibold hover:bg-accent"
            activeProps={{ className: "bg-accent" }}
          >
            Courses
          </Link>
          {signedIn ? (
            <Button asChild variant="pop" size="sm">
              <Link to="/dashboard">My dashboard</Link>
            </Button>
          ) : (
            <>
              <Link to="/auth" className="hidden rounded-lg px-3 py-2 text-sm font-semibold hover:bg-accent sm:block">
                Sign in
              </Link>
              <Button asChild variant="hero" size="sm">
                <Link to="/auth" search={{ mode: "signup" }}>
                  Get started
                </Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="border-t-2 border-ink bg-ink text-ink-foreground">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 md:flex-row md:items-center md:justify-between md:px-8">
        <Brand inverted />
        <p className="text-sm text-ink-foreground/70">
          Pre-KG to Grade 12 · Teacher-guided early years · Self-paced Grades 5–12
        </p>
      </div>
    </footer>
  );
}
