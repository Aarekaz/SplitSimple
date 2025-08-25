import type { Bill, Person, Item } from "@/contexts/BillContext"
import { Parser } from 'expr-eval'

export interface PersonTotal {
  personId: string
  subtotal: number
  tax: number
  tip: number
  discount: number
  total: number
}

export interface ItemBreakdown {
  itemId: string
  itemName: string
  itemPrice: number
  splits: Record<string, number> // personId -> amount
}

const mathParser = new Parser()

// Evaluate math expressions in price input (e.g., "7.48/2", "2*3.49")
export function evaluatePrice(input: string): number {
  try {
    // Basic safety check - only allow numbers, operators, parentheses, and decimal points
    if (!/^[\d+\-*/().\s]+$/.test(input)) {
      return Number.parseFloat(input) || 0
    }

    // Use safe math expression parser
    const expr = mathParser.parse(input)
    const result = expr.evaluate()
    return typeof result === "number" && !isNaN(result) ? Math.round(result * 100) / 100 : 0
  } catch {
    return Number.parseFloat(input) || 0
  }
}

// Calculate how much each person owes for a specific item, ensuring no "penny problems"
export function calculateItemSplits(item: Item, people: Person[]): Record<string, number> {
  const splits: Record<string, number> = {}
  const selectedPeople = people.filter((p) => item.splitWith.includes(p.id))

  if (selectedPeople.length === 0) {
    return splits
  }

  let totalAmountSplit = 0
  const itemPrice = parseFloat(item.price) || 0
  const priceInCents = Math.round(itemPrice * 100)

  switch (item.method) {
    case "even": {
      const amountPerPerson = Math.floor(priceInCents / selectedPeople.length)
      selectedPeople.forEach((person, index) => {
        if (index < selectedPeople.length - 1) {
          splits[person.id] = amountPerPerson / 100
          totalAmountSplit += amountPerPerson
        } else {
          // Last person gets the remainder
          splits[person.id] = (priceInCents - totalAmountSplit) / 100
        }
      })
      break
    }

    case "shares": {
      if (item.customSplits) {
        const totalShares = selectedPeople.reduce((sum, person) => sum + (item.customSplits![person.id] || 0), 0)
        if (totalShares > 0) {
          selectedPeople.forEach((person, index) => {
            if (index < selectedPeople.length - 1) {
              const shares = item.customSplits![person.id] || 0
              const amount = Math.round((priceInCents * shares) / totalShares)
              splits[person.id] = amount / 100
              totalAmountSplit += amount
            } else {
              splits[person.id] = (priceInCents - totalAmountSplit) / 100
            }
          })
        }
      }
      break
    }

    case "percent": {
      if (item.customSplits) {
        selectedPeople.forEach((person, index) => {
          if (index < selectedPeople.length - 1) {
            const percent = item.customSplits![person.id] || 0
            const amount = Math.round((priceInCents * percent) / 100)
            splits[person.id] = amount / 100
            totalAmountSplit += amount
          } else {
            splits[person.id] = (priceInCents - totalAmountSplit) / 100
          }
        })
      }
      break
    }

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

// Calculate totals for each person, ensuring no "penny problems"
export function calculatePersonTotals(bill: Bill): PersonTotal[] {
  const totals: PersonTotal[] = bill.people.map((person) => ({
    personId: person.id,
    subtotal: 0,
    tax: 0,
    tip: 0,
    discount: 0,
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

  // Calculate tax, tip, and discount allocation
  const billSubtotal = totals.reduce((sum, t) => sum + t.subtotal, 0)
  const tax = parseFloat(bill.tax) || 0
  const tip = parseFloat(bill.tip) || 0
  const discount = parseFloat(bill.discount) || 0
  const taxInCents = Math.round(tax * 100)
  const tipInCents = Math.round(tip * 100)
  const discountInCents = Math.round(discount * 100)
  let totalTaxSplit = 0
  let totalTipSplit = 0
  let totalDiscountSplit = 0

  if (billSubtotal > 0) {
    totals.forEach((personTotal, index) => {
      const isLastPerson = index === totals.length - 1

      switch (bill.taxTipAllocation) {
        case "proportional": {
          const proportion = personTotal.subtotal / billSubtotal
          if (!isLastPerson) {
            const taxAmount = Math.round(taxInCents * proportion)
            const tipAmount = Math.round(tipInCents * proportion)
            const discountAmount = Math.round(discountInCents * proportion)
            personTotal.tax = taxAmount / 100
            personTotal.tip = tipAmount / 100
            personTotal.discount = discountAmount / 100
            totalTaxSplit += taxAmount
            totalTipSplit += tipAmount
            totalDiscountSplit += discountAmount
          } else {
            personTotal.tax = (taxInCents - totalTaxSplit) / 100
            personTotal.tip = (tipInCents - totalTipSplit) / 100
            personTotal.discount = (discountInCents - totalDiscountSplit) / 100
          }
          break
        }

        case "even": {
          if (!isLastPerson) {
            const taxAmount = Math.floor(taxInCents / totals.length)
            const tipAmount = Math.floor(tipInCents / totals.length)
            const discountAmount = Math.floor(discountInCents / totals.length)
            personTotal.tax = taxAmount / 100
            personTotal.tip = tipAmount / 100
            personTotal.discount = discountAmount / 100
            totalTaxSplit += taxAmount
            totalTipSplit += tipAmount
            totalDiscountSplit += discountAmount
          } else {
            personTotal.tax = (taxInCents - totalTaxSplit) / 100
            personTotal.tip = (tipInCents - totalTipSplit) / 100
            personTotal.discount = (discountInCents - totalDiscountSplit) / 100
          }
          break
        }
      }
      personTotal.total = personTotal.subtotal + personTotal.tax + personTotal.tip - personTotal.discount
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
  const totalDiscount = personTotals.reduce((sum, t) => sum + t.discount, 0)
  const grandTotal = subtotal + totalTax + totalTip - totalDiscount

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    tax: Math.round(totalTax * 100) / 100,
    tip: Math.round(totalTip * 100) / 100,
    discount: Math.round(totalDiscount * 100) / 100,
    total: Math.round(grandTotal * 100) / 100,
    personTotals,
  }
}

// Generate item breakdown for export
export function getItemBreakdowns(bill: Bill): ItemBreakdown[] {
  return bill.items.map((item) => ({
    itemId: item.id,
    itemName: item.name,
    itemPrice: parseFloat(item.price) || 0,
    splits: calculateItemSplits(item, bill.people),
  }))
}
