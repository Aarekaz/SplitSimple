import type { Bill, Person, Item } from "@/contexts/BillContext"

export interface PersonTotal {
  personId: string
  subtotal: number
  tax: number
  tip: number
  total: number
}

export interface ItemBreakdown {
  itemId: string
  itemName: string
  itemPrice: number
  splits: Record<string, number> // personId -> amount
}

// Evaluate math expressions in price input (e.g., "7.48/2", "2*3.49")
export function evaluatePrice(input: string): number {
  try {
    // Basic safety check - only allow numbers, operators, parentheses, and decimal points
    if (!/^[\d+\-*/().\s]+$/.test(input)) {
      return Number.parseFloat(input) || 0
    }

    // Use Function constructor for safer evaluation than eval
    const result = new Function("return " + input)()
    return typeof result === "number" && !isNaN(result) ? Math.round(result * 100) / 100 : 0
  } catch {
    return Number.parseFloat(input) || 0
  }
}

// Calculate how much each person owes for a specific item
export function calculateItemSplits(item: Item, people: Person[]): Record<string, number> {
  const splits: Record<string, number> = {}
  const selectedPeople = people.filter((p) => item.splitWith.includes(p.id))

  if (selectedPeople.length === 0) {
    return splits
  }

  switch (item.method) {
    case "even":
      const evenAmount = item.price / selectedPeople.length
      selectedPeople.forEach((person) => {
        splits[person.id] = Math.round(evenAmount * 100) / 100
      })
      break

    case "shares":
      if (item.customSplits) {
        const totalShares = selectedPeople.reduce((sum, person) => sum + (item.customSplits![person.id] || 0), 0)
        if (totalShares > 0) {
          selectedPeople.forEach((person) => {
            const shares = item.customSplits![person.id] || 0
            splits[person.id] = Math.round(((item.price * shares) / totalShares) * 100) / 100
          })
        }
      }
      break

    case "percent":
      if (item.customSplits) {
        selectedPeople.forEach((person) => {
          const percent = item.customSplits![person.id] || 0
          splits[person.id] = Math.round(((item.price * percent) / 100) * 100) / 100
        })
      }
      break

    case "exact":
      if (item.customSplits) {
        selectedPeople.forEach((person) => {
          splits[person.id] = item.customSplits![person.id] || 0
        })
      }
      break
  }

  return splits
}

// Calculate totals for each person
export function calculatePersonTotals(bill: Bill): PersonTotal[] {
  const totals: PersonTotal[] = bill.people.map((person) => ({
    personId: person.id,
    subtotal: 0,
    tax: 0,
    tip: 0,
    total: 0,
  }))

  // Calculate subtotals from items
  bill.items.forEach((item) => {
    const itemSplits = calculateItemSplits(item, bill.people)
    Object.entries(itemSplits).forEach(([personId, amount]) => {
      const personTotal = totals.find((t) => t.personId === personId)
      if (personTotal) {
        personTotal.subtotal += amount
      }
    })
  })

  // Calculate tax and tip allocation
  const billSubtotal = totals.reduce((sum, t) => sum + t.subtotal, 0)

  if (billSubtotal > 0) {
    totals.forEach((personTotal) => {
      switch (bill.taxTipAllocation) {
        case "proportional":
          const proportion = personTotal.subtotal / billSubtotal
          personTotal.tax = Math.round(bill.tax * proportion * 100) / 100
          personTotal.tip = Math.round(bill.tip * proportion * 100) / 100
          break

        case "even":
          personTotal.tax = Math.round((bill.tax / bill.people.length) * 100) / 100
          personTotal.tip = Math.round((bill.tip / bill.people.length) * 100) / 100
          break

        case "specific":
          // For now, distribute evenly - could be enhanced to allow custom allocation
          personTotal.tax = Math.round((bill.tax / bill.people.length) * 100) / 100
          personTotal.tip = Math.round((bill.tip / bill.people.length) * 100) / 100
          break
      }

      personTotal.total = personTotal.subtotal + personTotal.tax + personTotal.tip
    })
  }

  return totals
}

// Get bill summary
export function getBillSummary(bill: Bill) {
  const personTotals = calculatePersonTotals(bill)
  const subtotal = personTotals.reduce((sum, t) => sum + t.subtotal, 0)
  const totalTax = personTotals.reduce((sum, t) => sum + t.tax, 0)
  const totalTip = personTotals.reduce((sum, t) => sum + t.tip, 0)
  const grandTotal = subtotal + totalTax + totalTip

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    tax: Math.round(totalTax * 100) / 100,
    tip: Math.round(totalTip * 100) / 100,
    total: Math.round(grandTotal * 100) / 100,
    personTotals,
  }
}

// Generate item breakdown for export
export function getItemBreakdowns(bill: Bill): ItemBreakdown[] {
  return bill.items.map((item) => ({
    itemId: item.id,
    itemName: item.name,
    itemPrice: item.price,
    splits: calculateItemSplits(item, bill.people),
  }))
}
