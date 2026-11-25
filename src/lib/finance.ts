export type TransactionFilters = {
  query: string;
  status: string;
  startDate: string;
  endDate: string;
  studentId: string;
  courseId: string;
  provider: string;
  minAmount: string;
  maxAmount: string;
  settlement: string;
};

export const emptyTransactionFilters: TransactionFilters = {
  query: "", status: "all", startDate: "", endDate: "", studentId: "all",
  courseId: "all", provider: "all", minAmount: "", maxAmount: "", settlement: "all",
};

type SearchablePayment = {
  created_at: string;
  status: string;
  student_id: string | null;
  course_id: string | null;
  provider: string;
  provider_ref: string | null;
  settlement_ref: string | null;
  reconciled_at: string | null;
  amount: number;
  payer: { full_name: string; email: string | null } | null;
  student: { full_name: string } | null;
  courses: { title: string } | null;
  price_plans: { name: string } | null;
};

export function transactionFilterError(filters: TransactionFilters): string | null {
  if (filters.startDate && filters.endDate && filters.startDate > filters.endDate) {
    return "End date must be on or after the start date.";
  }
  for (const amount of [filters.minAmount, filters.maxAmount]) {
    if (amount.trim() && (!Number.isFinite(Number(amount)) || Number(amount) < 0)) {
      return "Amounts must be valid non-negative numbers.";
    }
  }
  if (filters.minAmount.trim() && filters.maxAmount.trim() && Number(filters.minAmount) > Number(filters.maxAmount)) {
    return "Maximum amount must be at least the minimum amount.";
  }
  return null;
}

function dayBoundary(value: string, nextDay = false): number {
  const date = new Date(`${value}T00:00:00`);
  if (nextDay) date.setDate(date.getDate() + 1);
  return date.getTime();
}

export function filterTransactions<T extends SearchablePayment>(payments: T[], filters: TransactionFilters): T[] {
  if (transactionFilterError(filters)) return [];
  const query = filters.query.trim().toLowerCase();
  return payments.filter((payment) => {
    const timestamp = new Date(payment.created_at).getTime();
    if (filters.startDate && timestamp < dayBoundary(filters.startDate)) return false;
    if (filters.endDate && timestamp >= dayBoundary(filters.endDate, true)) return false;
    if (filters.status !== "all" && payment.status !== filters.status) return false;
    if (filters.studentId !== "all" && payment.student_id !== filters.studentId) return false;
    if (filters.courseId !== "all" && payment.course_id !== filters.courseId) return false;
    if (filters.provider !== "all" && payment.provider !== filters.provider) return false;
    if (filters.minAmount.trim() && Number(payment.amount) < Number(filters.minAmount)) return false;
    if (filters.maxAmount.trim() && Number(payment.amount) > Number(filters.maxAmount)) return false;
    if (filters.settlement === "reconciled" && !payment.reconciled_at) return false;
    if (filters.settlement === "unreconciled" && payment.reconciled_at) return false;
    return !query || [payment.payer?.full_name, payment.payer?.email, payment.student?.full_name,
      payment.courses?.title, payment.price_plans?.name, payment.provider_ref, payment.settlement_ref]
      .some((value) => value?.toLowerCase().includes(query));
  });
}