import type { Bill } from "@/lib/bill-types"
import { getBillSummary } from "@/lib/calculations"

const MAX_TITLE_LENGTH = 40

export interface SharedBillOgModel {
  /** Bill title, trimmed and truncated for the card headline. */
  title: string
  /** Pluralized participant count, e.g. "1 person" / "4 people". */
  peopleLabel: string
  /** Currency-formatted grand total, e.g. "$186.40". */
  totalLabel: string
}

function truncate(value: string, max: number): string {
  if (value.length <= max) return value
  // Trim trailing whitespace left behind by the cut so the ellipsis reads cleanly.
  return `${value.slice(0, max - 1).trimEnd()}…`
}

function formatCurrency(amount: number): string {
  const safeAmount = Number.isFinite(amount) ? amount : 0
  return `$${safeAmount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

/**
 * Derives the privacy-conscious fields shown on a shared bill's social card.
 * Intentionally exposes only the title, participant count, and grand total —
 * never individual names or per-person amounts.
 */
export function buildSharedBillOgModel(bill: Bill): SharedBillOgModel {
  const peopleCount = bill.people.length
  const trimmedTitle = bill.title.trim()

  return {
    title: trimmedTitle ? truncate(trimmedTitle, MAX_TITLE_LENGTH) : "Shared bill",
    peopleLabel: `${peopleCount} ${peopleCount === 1 ? "person" : "people"}`,
    totalLabel: formatCurrency(getBillSummary(bill).total),
  }
}
