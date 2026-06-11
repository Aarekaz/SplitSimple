import type { Bill, Item, Person } from "@/lib/bill-types"

// Mirrors the canonical `COLORS` palette in ProBillSplitter (hex values, same order).
// `color` and `colorIdx` are both derived from this single source so the stored hex
// always matches the swatch the Pro view renders via COLORS[colorIdx].
const PERSON_COLORS = [
  "#4F46E5", // indigo
  "#F97316", // orange
  "#F43F5E", // rose
  "#10B981", // emerald
  "#3B82F6", // blue
  "#F59E0B", // amber
]

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function sanitizeAmount(value: number) {
  return Math.max(0, Math.round(value * 100) / 100)
}

function formatAmount(value: number) {
  return sanitizeAmount(value).toFixed(2)
}

export type QuickSplitMode = "even" | "shares" | "exact"

export interface QuickSplitParticipantInput {
  name: string
  shares?: number
  exactAmount?: number
}

export interface QuickSplitDraftInput {
  title: string
  amount: number
  tax?: number
  tip?: number
  discount?: number
  allocation?: "proportional" | "even"
  splitMode?: QuickSplitMode
  participants: QuickSplitParticipantInput[]
}

export function buildQuickSplitBill(input: QuickSplitDraftInput): Bill {
  const splitMode = input.splitMode ?? "even"
  const amount = sanitizeAmount(input.amount)
  const tax = sanitizeAmount(input.tax ?? 0)
  const tip = sanitizeAmount(input.tip ?? 0)
  const discount = sanitizeAmount(input.discount ?? 0)

  const people: Person[] = input.participants.map((participant, index) => {
    const colorIdx = index % PERSON_COLORS.length
    return {
      id: createId(),
      name: participant.name.trim(),
      color: PERSON_COLORS[colorIdx],
      colorIdx,
    }
  })

  const item: Item = {
    id: createId(),
    name: "Shared total",
    price: formatAmount(amount),
    quantity: 1,
    splitWith: people.map((person) => person.id),
    method: splitMode,
  }

  if (splitMode === "shares") {
    item.customSplits = Object.fromEntries(
      people.map((person, index) => [person.id, input.participants[index]?.shares ?? 1])
    )
  }

  if (splitMode === "exact") {
    item.customSplits = Object.fromEntries(
      people.map((person, index) => [person.id, sanitizeAmount(input.participants[index]?.exactAmount ?? 0)])
    )
  }

  return {
    id: createId(),
    title: input.title.trim() || "Quick Split",
    status: "active",
    tax: tax > 0 ? formatAmount(tax) : "",
    tip: tip > 0 ? formatAmount(tip) : "",
    discount: discount > 0 ? formatAmount(discount) : "",
    taxTipAllocation: input.allocation ?? "proportional",
    notes: "",
    people,
    items: [item],
  }
}

export function buildManualItemizedBill(title = "Manual Split"): Bill {
  const firstPerson: Person = {
    id: createId(),
    name: "Person 1",
    color: PERSON_COLORS[0],
    colorIdx: 0,
  }

  const starterItems: Item[] = Array.from({ length: 3 }, () => ({
    id: createId(),
    name: "",
    price: "",
    quantity: 1,
    splitWith: [firstPerson.id],
    method: "even" as const,
  }))

  return {
    id: createId(),
    title: title.trim() || "Manual Split",
    status: "active",
    tax: "",
    tip: "",
    discount: "",
    taxTipAllocation: "proportional",
    notes: "",
    people: [firstPerson],
    items: starterItems,
  }
}
