import { getBillSummary } from "@/lib/calculations"
import { buildManualItemizedBill, buildQuickSplitBill } from "@/lib/bill-start"

describe("bill-start helpers", () => {
  it("builds an even quick split bill that reconciles", () => {
    const bill = buildQuickSplitBill({
      title: "Bar tab",
      amount: 80,
      tax: 6.4,
      tip: 13.6,
      participants: [
        { name: "Anurag" },
        { name: "Sunil" },
        { name: "Praks" },
        { name: "Shambhavi" },
      ],
    })

    const summary = getBillSummary(bill)

    expect(bill.items).toHaveLength(1)
    expect(summary.subtotal).toBe(80)
    expect(summary.tax).toBe(6.4)
    expect(summary.tip).toBe(13.6)
    expect(summary.total).toBe(100)
    expect(summary.personTotals).toHaveLength(4)
    expect(summary.personTotals.every((person) => person.total === 25)).toBe(true)
  })

  it("builds an exact quick split bill with person amounts", () => {
    const bill = buildQuickSplitBill({
      title: "Taxi",
      amount: 42,
      splitMode: "exact",
      participants: [
        { name: "Anurag", exactAmount: 12 },
        { name: "Sunil", exactAmount: 10 },
        { name: "Praks", exactAmount: 20 },
      ],
    })

    const summary = getBillSummary(bill)

    expect(summary.total).toBe(42)
    expect(summary.personTotals.map((person) => person.total)).toEqual([12, 10, 20])
  })

  it("builds a manual itemized draft with starter rows", () => {
    const bill = buildManualItemizedBill("Groceries")

    expect(bill.title).toBe("Groceries")
    expect(bill.people).toHaveLength(1)
    expect(bill.items).toHaveLength(3)
    expect(bill.items.every((item) => item.quantity === 1 && item.method === "even")).toBe(true)
    expect(bill.items.every((item) => item.splitWith.length === 1)).toBe(true)
  })
})
