import { describe, expect, it } from "vitest";
import { emptyTransactionFilters, filterTransactions, transactionFilterError } from "@/lib/finance";

const payments = [
  { id: "one", created_at: "2026-11-04T23:59:59", status: "succeeded", student_id: "student-a", course_id: "course-a", provider: "simulated", provider_ref: "SIM-ONE", settlement_ref: "BANK-ONE", reconciled_at: "2026-11-05", amount: 39, payer: { full_name: "Ruth", email: "ruth@example.test" }, student: { full_name: "Amelia" }, courses: { title: "Counting" }, price_plans: null },
  { id: "two", created_at: "2026-11-05T00:00:00", status: "failed", student_id: "student-b", course_id: "course-b", provider: "other-test-provider", provider_ref: "TEST-TWO", settlement_ref: null, reconciled_at: null, amount: 69, payer: { full_name: "Ruth", email: "ruth@example.test" }, student: { full_name: "Ben" }, courses: { title: "Algebra" }, price_plans: { name: "Term pass" } },
];
const ids = (filters: Partial<typeof emptyTransactionFilters>) => filterTransactions(payments, { ...emptyTransactionFilters, ...filters }).map((p) => p.id);

describe("SRS finance transaction filters", () => {
  it("includes the entire selected end date, but not the next day", () => expect(ids({ startDate: "2026-11-04", endDate: "2026-11-04" })).toEqual(["one"]));
  it("filters by student", () => expect(ids({ studentId: "student-b" })).toEqual(["two"]));
  it("filters by course", () => expect(ids({ courseId: "course-a" })).toEqual(["one"]));
  it("filters by payment provider", () => expect(ids({ provider: "simulated" })).toEqual(["one"]));
  it("includes both amount range boundaries", () => expect(ids({ minAmount: "39", maxAmount: "69" })).toEqual(["one", "two"]));
  it("excludes amounts outside the selected range", () => expect(ids({ minAmount: "40", maxAmount: "69" })).toEqual(["two"]));
  it("filters by payment status", () => expect(ids({ status: "failed" })).toEqual(["two"]));
  it("filters settlement records", () => expect(ids({ settlement: "reconciled" })).toEqual(["one"]));
  it("filters payments waiting for reconciliation", () => expect(ids({ settlement: "unreconciled" })).toEqual(["two"]));
  it("searches student names independently from payer names", () => expect(ids({ query: "amelia" })).toEqual(["one"]));
  it("searches plan names and settlement references", () => { expect(ids({ query: "term pass" })).toEqual(["two"]); expect(ids({ query: "bank-one" })).toEqual(["one"]); });
  it("combines filters rather than ignoring sibling restrictions", () => expect(ids({ studentId: "student-b", status: "succeeded" })).toEqual([]));
  it("rejects reversed date and amount ranges", () => { expect(transactionFilterError({ ...emptyTransactionFilters, startDate: "2026-11-05", endDate: "2026-11-04" })).not.toBeNull(); expect(ids({ minAmount: "70", maxAmount: "39" })).toEqual([]); });
  it("rejects invalid amounts", () => { expect(ids({ minAmount: "-1" })).toEqual([]); expect(ids({ maxAmount: "Infinity" })).toEqual([]); });
});