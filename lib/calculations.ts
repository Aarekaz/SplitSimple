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

  const itemPrice = parseFloat(item.price) || 0
  const quantity = item.quantity || 1
  const totalPrice = itemPrice * quantity
  
  // Ensure we're working with valid numbers
  if (isNaN(totalPrice) || totalPrice < 0) {
    return splits
  }
  
  const priceInCents = Math.round(totalPrice * 100)

  switch (item.method) {
    case "even": {
      const amountPerPerson = Math.floor(priceInCents / selectedPeople.length)
      const remainder = priceInCents % selectedPeople.length
      
      selectedPeople.forEach((person, index) => {
        if (index < remainder) {
          // Distribute remainder pennies to first few people
          splits[person.id] = (amountPerPerson + 1) / 100
        } else {
          splits[person.id] = amountPerPerson / 100
        }
      })
      break
    }

    case "shares": {
      if (item.customSplits) {
        const totalShares = selectedPeople.reduce((sum, person) => sum + (item.customSplits![person.id] || 0), 0)
        if (totalShares > 0) {
          let distributedAmount = 0
          selectedPeople.forEach((person, index) => {
            if (index < selectedPeople.length - 1) {
              const shares = item.customSplits![person.id] || 0
              const amount = Math.round((priceInCents * shares) / totalShares)
              splits[person.id] = amount / 100
              distributedAmount += amount
            } else {
              // Last person gets the remainder to avoid penny problems
              splits[person.id] = (priceInCents - distributedAmount) / 100
            }
          })
        }
      }
      break
    }

    case "percent": {
      if (item.customSplits) {
        let distributedAmount = 0
        selectedPeople.forEach((person, index) => {
          if (index < selectedPeople.length - 1) {
            const percent = item.customSplits![person.id] || 0
            const amount = Math.round((priceInCents * percent) / 100)
            splits[person.id] = amount / 100
            distributedAmount += amount
          } else {
            // Last person gets the remainder to avoid penny problems
            splits[person.id] = (priceInCents - distributedAmount) / 100
          }
        })
      }
      break
    }

    case "exact":
      if (item.customSplits) {
        let totalExactAmount = 0
        selectedPeople.forEach((person) => {
          const exactAmount = item.customSplits![person.id] || 0
          splits[person.id] = exactAmount
          totalExactAmount += exactAmount
        })
        
        // Validate that exact amounts sum to total price
        if (Math.abs(totalExactAmount - totalPrice) > 0.01) {
          console.warn(`Exact split amounts (${totalExactAmount}) don't match item price (${totalPrice})`)
        }
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
  
  // Validate inputs
  if (isNaN(tax) || isNaN(tip) || isNaN(discount)) {
    console.warn('Invalid tax, tip, or discount values detected', { tax, tip, discount })
    // Return totals with zero tax/tip/discount to prevent NaN errors
    totals.forEach(total => {
      total.tax = 0
      total.tip = 0
      total.discount = 0
      total.total = Math.round(total.subtotal * 100) / 100
    })
    return totals
  }
  
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
            // Last person gets the remainder to avoid penny problems
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
            // Last person gets the remainder to avoid penny problems
            personTotal.tax = (taxInCents - totalTaxSplit) / 100
            personTotal.tip = (tipInCents - totalTipSplit) / 100
            personTotal.discount = (discountInCents - totalDiscountSplit) / 100
          }
          break
        }
      }
      
      // Ensure all amounts are properly rounded
      personTotal.tax = Math.round(personTotal.tax * 100) / 100
      personTotal.tip = Math.round(personTotal.tip * 100) / 100
      personTotal.discount = Math.round(personTotal.discount * 100) / 100
      personTotal.total = Math.round((personTotal.subtotal + personTotal.tax + personTotal.tip - personTotal.discount) * 100) / 100
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
    itemPrice: (parseFloat(item.price) || 0) * (item.quantity || 1),
    splits: calculateItemSplits(item, bill.people),
  }))
}
