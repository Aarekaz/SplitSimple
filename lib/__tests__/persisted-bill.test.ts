import { normalizeBillForPersistence } from "@/lib/persisted-bill"
import { createMockBill, createMockItem } from "../../tests/utils/test-utils"

describe("normalizeBillForPersistence", () => {
  it("removes empty seeded rows before saving", () => {
    const bill = createMockBill({
      title: "  Team Lunch  ",
      notes: "  Remember dessert  ",
      items: [
        createMockItem({ name: "", price: "", quantity: 1, splitWith: [] }),
        createMockItem({ name: "Tacos", price: "12.34", quantity: 1, splitWith: [] }),
      ],
    })

    const normalized = normalizeBillForPersistence(bill)

    expect(normalized.title).toBe("Team Lunch")
    expect(normalized.notes).toBe("Remember dessert")
    expect(normalized.items).toHaveLength(1)
    expect(normalized.items[0].name).toBe("Tacos")
  })

  it("keeps partially filled rows that have meaningful content", () => {
    const bill = createMockBill({
      items: [
        createMockItem({ name: "", price: "5.00", quantity: 1, splitWith: [] }),
      ],
    })

    const normalized = normalizeBillForPersistence(bill)

    expect(normalized.items).toHaveLength(1)
    expect(normalized.items[0].price).toBe("5.00")
  })
})
