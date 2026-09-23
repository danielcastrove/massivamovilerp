import { RecurrenceType, BillingCycle } from "@prisma/client";
import { addDays } from "date-fns";

export function getRecurrenceDays(r: RecurrenceType | null | undefined): number {
  switch (r) {
    case "MENSUAL": return 30;
    case "BIMENSUAL": return 60;
    case "TRES_MESES_A_UN_AÑO": return 90;
    case "MAS_DE_UN_AÑO": return 365;
    default: return 30;
  }
}

export function getBillingCycleDays(b: BillingCycle | null | undefined): number {
  switch (b) {
    case "MONTHLY": return 30;
    case "BIMONTHLY": return 60;
    default: return 30;
  }
}

export function calcularFechaVencimientoServicio(
  issueDate: Date,
  recurrence: RecurrenceType | null | undefined,
  billingCycle: BillingCycle | null | undefined
): Date {
  const recurrenceDays = getRecurrenceDays(recurrence);
  const billingDays = getBillingCycleDays(billingCycle);
  return addDays(issueDate, Math.max(recurrenceDays, billingDays));
}
