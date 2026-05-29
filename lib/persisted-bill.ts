import type { Bill, Item } from "@/lib/bill-types"

function hasMeaningfulItemContent(item: Item): boolean {
  return (
    item.name.trim() !== "" ||
    item.price.trim() !== "" ||
    item.quantity !== 1 ||
    item.splitWith.length > 0 ||
    Object.keys(item.customSplits ?? {}).length > 0
  )
}

export function normalizeBillForPersistence(bill: Bill): Bill {
  return {
    ...bill,
    title: bill.title.trim() || "New Bill",
    notes: bill.notes.trim(),
    items: bill.items
      .filter(hasMeaningfulItemContent)
      .map((item) => ({
        ...item,
        name: item.name.trim(),
        price: item.price.trim(),
      })),
  }
}
