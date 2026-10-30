import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CreditCard, Lock, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe, unwrap } from "@/lib/session";
import { myChildrenQuery } from "@/lib/actions";
import { moneyExact } from "@/lib/format";
import { EmptyState, Loading, PageHeader } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/checkout")({
  validateSearch: (s: Record<string, unknown>): { courseId?: string; planId?: string } => ({
    ...(typeof s["courseId"] === "string" ? { courseId: s["courseId"] } : {}),
    ...(typeof s["planId"] === "string" ? { planId: s["planId"] } : {}),
  }),
  head: () => ({ meta: [{ title: "Checkout — Brightpath" }] }),
  component: Checkout,
});

type Preview = { label: string; subtotal: number; discount: number; total: number; currency: string; coupon_valid: boolean | null };

function Checkout() {
  const { courseId, planId } = Route.useSearch();
  const me = useMe();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const isStudent = me.roles.includes("student");
  const isParent = me.roles.includes("parent");
  const children = useQuery({ ...myChildrenQuery(me.id), enabled: isParent });
  const [studentId, setStudentId] = useState<string>(isStudent ? me.id : "");
  const [coupon, setCoupon] = useState("");
  const [applied, setApplied] = useState("");
  const [outcome, setOutcome] = useState<"succeeded" | "failed">("succeeded");
  const [card, setCard] = useState({ name: me.profile?.full_name ?? "", number: "4242 4242 4242 4242" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!studentId && children.data?.[0]) setStudentId(children.data[0].id);
  }, [children.data, studentId]);

  const preview = useQuery({
    queryKey: ["checkout-preview", courseId, planId, applied],
    enabled: !!(courseId || planId),
    queryFn: async () =>
      unwrap(
        await supabase.rpc("preview_checkout", {
          ...(courseId ? { _course_id: courseId } : {}),
          ...(planId ? { _plan_id: planId } : {}),
          ...(applied ? { _coupon: applied } : {}),
        }),
      ) as unknown as Preview,
  });

  if (!courseId && !planId) {
    return <EmptyState title="Nothing to check out" action={<Button asChild variant="hero"><Link to="/catalog">Browse courses</Link></Button>} />;
  }
  if (!isStudent && !isParent) {
    return <EmptyState title="Checkout is for students and parents" description="Sign in with a student or parent account to enroll." />;
  }
  if (isParent && !isStudent && children.data && children.data.length === 0) {
    return (
      <EmptyState
        title="Link your child first"
        description="Parents can buy courses for a verified linked child. Send a link request from your family dashboard."
        action={<Button asChild variant="hero"><Link to="/family">Go to family dashboard</Link></Button>}
      />
    );
  }

  async function pay() {
    if (!studentId) return toast.error("Choose who the course is for");
    setBusy(true);
    const { data, error } = await supabase.rpc("simulate_checkout", {
      _student_id: studentId,
      ...(courseId ? { _course_id: courseId } : {}),
      ...(planId ? { _plan_id: planId } : {}),
      ...(applied ? { _coupon: applied } : {}),
      _outcome: outcome,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    await qc.invalidateQueries();
    if (outcome === "failed") {
      toast.error("The payment was declined. No charge was made — try again.");
      return;
    }
    toast.success("Payment successful — you're enrolled!");
    if (studentId === me.id && courseId) navigate({ to: "/learn/$courseId", params: { courseId } });
    else if (studentId === me.id) navigate({ to: "/learn" });
    else navigate({ to: "/payments", search: { highlight: data ?? undefined } });
  }

  const p = preview.data;
  const free = p ? Number(p.total) === 0 : false;

  return (
    <div>
      <PageHeader eyebrow="Checkout" title="Complete your enrollment" />
      {preview.isLoading ? (
        <Loading />
      ) : preview.error ? (
        <EmptyState title="This item can't be purchased" description={preview.error.message} />
      ) : p ? (
        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="grid gap-6">
            <div className="pop-card p-6">
              <h2 className="font-display text-lg font-bold">Who is this for?</h2>
              <div className="mt-4">
                {isParent ? (
                  <Select value={studentId} onValueChange={setStudentId}>
                    <SelectTrigger className="border-2 bg-card"><SelectValue placeholder="Choose a child" /></SelectTrigger>
                    <SelectContent>
                      {isStudent && <SelectItem value={me.id}>Me</SelectItem>}
                      {(children.data ?? []).map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm">For you, <b>{me.profile?.full_name}</b></p>
                )}
              </div>
            </div>

            {!free && (
              <div className="pop-card p-6">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-lg font-bold">Payment details</h2>
                  <span className="flex items-center gap-1 text-xs font-semibold text-muted-foreground"><Lock className="size-3" /> Test mode</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Payments are simulated while a payment provider is chosen. No real card is charged.
                </p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-1.5">
                    <Label htmlFor="cn">Name on card</Label>
                    <Input id="cn" value={card.name} onChange={(e) => setCard({ ...card, name: e.target.value })} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="cnum">Card number</Label>
                    <Input id="cnum" value={card.number} onChange={(e) => setCard({ ...card, number: e.target.value })} />
                  </div>
                </div>
                <div className="mt-5">
                  <Label>Test outcome</Label>
                  <RadioGroup value={outcome} onValueChange={(v) => setOutcome(v as "succeeded" | "failed")} className="mt-2 flex gap-6">
                    <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="succeeded" /> Payment approved</label>
                    <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="failed" /> Payment declined</label>
                  </RadioGroup>
                </div>
              </div>
            )}
          </div>

          <aside className="pop-card h-fit p-6">
            <p className="text-xs font-bold uppercase tracking-wider text-teal">{planId ? "Plan" : "Course"}</p>
            <h2 className="mt-1 font-display text-xl font-bold">{p.label}</h2>
            <dl className="mt-5 grid gap-2 text-sm">
              <div className="flex justify-between"><dt>Subtotal</dt><dd>{moneyExact(p.subtotal, p.currency)}</dd></div>
              {Number(p.discount) > 0 && (
                <div className="flex justify-between text-teal"><dt>Discount ({applied})</dt><dd>−{moneyExact(p.discount, p.currency)}</dd></div>
              )}
              <div className="flex justify-between border-t-2 border-ink pt-2 font-display text-xl font-extrabold"><dt>Total</dt><dd>{moneyExact(p.total, p.currency)}</dd></div>
            </dl>
            {!free && (
              <form
                className="mt-5 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  setApplied(coupon.trim());
                }}
              >
                <Input placeholder="Coupon code" value={coupon} onChange={(e) => setCoupon(e.target.value)} />
                <Button type="submit" variant="outline">Apply</Button>
              </form>
            )}
            {p.coupon_valid === false && <p className="mt-2 text-xs font-semibold text-coral">That code isn't valid or has expired.</p>}
            <Button variant="hero" size="lg" className="mt-6 w-full" disabled={busy || !studentId} onClick={pay}>
              {free ? <ShieldCheck /> : <CreditCard />} {free ? "Enroll for free" : `Pay ${moneyExact(p.total, p.currency)}`}
            </Button>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
