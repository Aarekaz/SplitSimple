import { useMemo } from 'react'
import type { Item, Person } from '@/contexts/BillContext'

export interface CalculatedItem extends Item {
  totalItemPrice: number
  pricePerPerson: number
  priceNumber: number
  qty: number
}

export interface PersonShare {
  subtotal: number
  tax: number
  tip: number
  discount: number
  total: number
  ratio: number
  items: CalculatedItem[]
}

export function useBillCalculations(
  items: Item[],
  people: Person[],
  bill: { tax: string; tip: string; discount: string }
) {
  const calculatedItems = useMemo<CalculatedItem[]>(() => items.map(item => {
    const priceNumber = parseFloat(item.price || '0')
    const qty = item.quantity || 1
    const totalItemPrice = priceNumber * qty
    const splitCount = item.splitWith.length
    const pricePerPerson = splitCount > 0 ? totalItemPrice / splitCount : 0
    return { ...item, totalItemPrice, pricePerPerson, priceNumber, qty }
  }), [items])

  const { subtotal, taxAmount, tipAmount, discountAmount, grandTotal } = useMemo(() => {
    const sub = calculatedItems.reduce((acc, item) => acc + item.totalItemPrice, 0)
    const tax = parseFloat(bill.tax || '0')
    const tip = parseFloat(bill.tip || '0')
    const disc = parseFloat(bill.discount || '0')
    return {
      subtotal: sub,
      taxAmount: tax,
      tipAmount: tip,
      discountAmount: disc,
      grandTotal: sub + tax + tip - disc
    }
  }, [calculatedItems, bill.tax, bill.tip, bill.discount])

  const personFinalShares = useMemo(() => {
    const shares: Record<string, PersonShare> = {}
    const totalWeight = subtotal > 0 ? subtotal : 1

    people.forEach(p => {
      let personSub = 0
      calculatedItems.forEach(item => {
        if (item.splitWith.includes(p.id)) {
          personSub += item.pricePerPerson
        }
      })

      const ratio = totalWeight > 0 ? personSub / totalWeight : 0
      const tax = taxAmount * ratio
      const tip = tipAmount * ratio
      const disc = discountAmount * ratio

      shares[p.id] = {
        subtotal: personSub,
        tax,
        tip,
        discount: disc,
        total: personSub + tax + tip - disc,
        ratio: ratio * 100,
        items: calculatedItems.filter(i => i.splitWith.includes(p.id))
      }
    })

    return shares
  }, [calculatedItems, people, subtotal, taxAmount, tipAmount, discountAmount])

  const hasMeaningfulItems = useMemo(() => {
    return items.some(i => (i.name || '').trim() !== '' || (i.price || '').trim() !== '' || (i.quantity || 1) !== 1)
  }, [items])

  const itemsById = useMemo(() => new Map(items.map(item => [item.id, item])), [items])
  const peopleById = useMemo(() => new Map(people.map(person => [person.id, person])), [people])

  return {
    calculatedItems,
    subtotal,
    taxAmount,
    tipAmount,
    discountAmount,
    grandTotal,
    personFinalShares,
    hasMeaningfulItems,
    itemsById,
    peopleById,
  }
}
