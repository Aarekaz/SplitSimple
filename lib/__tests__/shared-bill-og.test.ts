import { buildQuickSplitBill } from "@/lib/bill-start"
import { buildSharedBillOgModel } from "@/lib/shared-bill-og"
import type { Bill } from "@/lib/bill-types"

const baseBill: Bill = {
  id: "bill-1",
  title: "Dinner at Nopa",
  status: "active",
  tax: "",
  tip: "",
  discount: "",
  taxTipAllocation: "proportional",
  notes: "",
  people: [
    { id: "p1", name: "Anurag", color: "#000", colorIdx: 0 },
    { id: "p2", name: "Sunil", color: "#111", colorIdx: 1 },
  ],
  items: [],
}

describe("buildSharedBillOgModel", () => {
  it("derives title, plural people label, and currency total", () => {
    const bill = buildQuickSplitBill({
      title: "Dinner at Nopa",
      amount: 180,
      tax: 6.4,
      participants: [{ name: "Anurag" }, { name: "Sunil" }, { name: "Praks" }, { name: "Shambhavi" }],
    })

    const model = buildSharedBillOgModel(bill)

    expect(model.title).toBe("Dinner at Nopa")
    expect(model.peopleLabel).toBe("4 people")
    expect(model.totalLabel).toBe("$186.40")
  })

  it("uses the singular form for a single participant", () => {
    const model = buildSharedBillOgModel({ ...baseBill, people: [baseBill.people[0]] })
    expect(model.peopleLabel).toBe("1 person")
  })

  it("formats large totals with thousands separators", () => {
    const bill = buildQuickSplitBill({
      title: "Group trip",
      amount: 1234.5,
      participants: [{ name: "A" }, { name: "B" }],
    })
    expect(buildSharedBillOgModel(bill).totalLabel).toBe("$1,234.50")
  })

  it("truncates overly long titles with an ellipsis", () => {
    const longTitle = "A really long dinner title that will not fit on the card at all"
    const model = buildSharedBillOgModel({ ...baseBill, title: longTitle })
    expect(model.title.endsWith("…")).toBe(true)
    expect(model.title.length).toBeLessThanOrEqual(40)
  })

  it("falls back to a generic title when the bill title is blank", () => {
    const model = buildSharedBillOgModel({ ...baseBill, title: "   " })
    expect(model.title).toBe("Shared bill")
  })

  it("reports a zero total for an empty bill", () => {
    const model = buildSharedBillOgModel({ ...baseBill, items: [] })
    expect(model.totalLabel).toBe("$0.00")
  })
})
