import type { Bill, Item, Person } from "@/lib/bill-types"

const PERSON_COLORS = [
  "#6366f1",
  "#d97706",
  "#dc2626",
  "#22c55e",
  "#f59e0b",
  "#8b5cf6",
  "#06b6d4",
  "#ef4444",
  "#10b981",
  "#f97316",
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

  const people: Person[] = input.participants.map((participant, index) => ({
    id: createId(),
    name: participant.name.trim(),
    color: PERSON_COLORS[index % PERSON_COLORS.length],
    colorIdx: index % 6,
  }))

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
