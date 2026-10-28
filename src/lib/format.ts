import { format, formatDistanceToNow } from "date-fns";

export function money(amount: number | null | undefined, currency = "USD") {
  const n = Number(amount ?? 0);
  if (n === 0) return "Free";
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n);
}

export function moneyExact(amount: number | null | undefined, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(Number(amount ?? 0));
}

export function dateShort(d: string | null | undefined) {
  if (!d) return "—";
  return format(new Date(d), "MMM d, yyyy");
}

export function dateTime(d: string | null | undefined) {
  if (!d) return "—";
  return format(new Date(d), "MMM d, yyyy · h:mm a");
}

export function ago(d: string | null | undefined) {
  if (!d) return "";
  return formatDistanceToNow(new Date(d), { addSuffix: true });
}

export function pct(score: number | null | undefined, max: number | null | undefined) {
  if (score == null || !max) return null;
  return Math.round((Number(score) / Number(max)) * 100);
}

export function initials(name: string | null | undefined) {
  return (name ?? "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

type CsvValue = string | number | boolean | null | undefined;

export function downloadCsv(filename: string, rows: Record<string, CsvValue>[]) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0] ?? {});
  const escape = (v: CsvValue) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join(
    "\n",
  );
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
