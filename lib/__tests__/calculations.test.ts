import { 
  evaluatePrice, 
  calculateItemSplits, 
  calculatePersonTotals, 
  getBillSummary,
  getItemBreakdowns 
} from '../calculations'
import type { Bill, Person, Item } from '@/contexts/BillContext'
import { createMockPerson, createMockItem, createMockBill, expectCurrencyToBe } from '../../tests/utils/test-utils'

describe('calculations', () => {
  describe('evaluatePrice', () => {
    it('should parse simple numbers', () => {
      expect(evaluatePrice('10')).toBe(10)
      expect(evaluatePrice('10.50')).toBe(10.5)
      expect(evaluatePrice('0')).toBe(0)
    })

    it('should evaluate basic math expressions', () => {
      expect(evaluatePrice('10 + 5')).toBe(15)
      expect(evaluatePrice('20 - 3')).toBe(17)
      expect(evaluatePrice('8 * 2')).toBe(16)
      expect(evaluatePrice('15 / 3')).toBe(5)
    })

    it('should handle complex expressions', () => {
      expect(evaluatePrice('(10 + 5) * 2')).toBe(30)
      expect(evaluatePrice('7.48 / 2')).toBe(3.74)
      expect(evaluatePrice('2 * 3.49')).toBe(6.98)
    })

    it('should handle invalid input gracefully', () => {
      expect(evaluatePrice('')).toBe(0)
      expect(evaluatePrice('abc')).toBe(0)
      // '10 + abc' fails regex test so falls back to parseFloat('10 + abc') = 10
      expect(evaluatePrice('10 + abc')).toBe(10)
    })

    it('should handle unsafe expressions by falling back to parseFloat', () => {
      expect(evaluatePrice('eval("malicious")')).toBe(0)
      // '10 + alert("xss")' fails regex and parseFloat('10 + alert("xss")') = 10
      expect(evaluatePrice('10 + alert("xss")')).toBe(10)
      // '10; delete window' fails regex and parseFloat('10; delete window') = 10
      expect(evaluatePrice('10; delete window')).toBe(10)
    })

    it('should round to 2 decimal places', () => {
      expect(evaluatePrice('10 / 3')).toBe(3.33)
      expect(evaluatePrice('1 / 3')).toBe(0.33)
    })
  })

  describe('calculateItemSplits', () => {
    const person1 = createMockPerson({ id: '1', name: 'Alice' })
    const person2 = createMockPerson({ id: '2', name: 'Bob' })
    const person3 = createMockPerson({ id: '3', name: 'Charlie' })
    const people = [person1, person2, person3]

    it('should split evenly and avoid penny problems', () => {
      const item = createMockItem({
        price: '10.01',
        method: 'even',
        splitWith: [person1.id, person2.id, person3.id]
      })

      const splits = calculateItemSplits(item, people)

      // Check that splits add up exactly to the item price
      const total = Object.values(splits).reduce((sum, amount) => sum + amount, 0)
      expectCurrencyToBe(total, 10.01)

      // Check individual amounts
      expect(splits[person1.id]).toBe(3.33)
      expect(splits[person2.id]).toBe(3.33)
      expect(splits[person3.id]).toBe(3.35) // Last person gets remainder
    })

    it('should split by shares proportionally', () => {
      const item = createMockItem({
        price: '12.00',
        method: 'shares',
        splitWith: [person1.id, person2.id],
        customSplits: {
          [person1.id]: 1, // 1 share
          [person2.id]: 2  // 2 shares
        }
      })

      const splits = calculateItemSplits(item, people)

      expectCurrencyToBe(splits[person1.id], 4.00) // 1/3 of 12
      expectCurrencyToBe(splits[person2.id], 8.00) // 2/3 of 12
    })

    it('should split by percentage', () => {
      const item = createMockItem({
        price: '100.00',
        method: 'percent',
        splitWith: [person1.id, person2.id],
        customSplits: {
          [person1.id]: 30, // 30%
          [person2.id]: 70  // 70%
        }
      })

      const splits = calculateItemSplits(item, people)

      expectCurrencyToBe(splits[person1.id], 30.00)
      expectCurrencyToBe(splits[person2.id], 70.00)
    })

    it('should use exact amounts', () => {
      const item = createMockItem({
        price: '25.00',
        method: 'exact',
        splitWith: [person1.id, person2.id],
        customSplits: {
          [person1.id]: 10.50,
          [person2.id]: 14.50
        }
      })

      const splits = calculateItemSplits(item, people)

      expect(splits[person1.id]).toBe(10.50)
      expect(splits[person2.id]).toBe(14.50)
    })

    it('should handle edge case with one person', () => {
      const item = createMockItem({
        price: '15.99',
        method: 'even',
        splitWith: [person1.id]
      })

      const splits = calculateItemSplits(item, people)

      expectCurrencyToBe(splits[person1.id], 15.99)
      expect(splits[person2.id]).toBeUndefined()
    })
  })

  describe('calculatePersonTotals', () => {
    it('should calculate person totals with proportional tax and tip', () => {
      const person1 = createMockPerson({ id: '1', name: 'Alice' })
      const person2 = createMockPerson({ id: '2', name: 'Bob' })
      
      const item1 = createMockItem({
        name: 'Item 1',
        price: '20.00',
        splitWith: [person1.id, person2.id]
      })
      
      const bill = createMockBill({
        people: [person1, person2],
        items: [item1],
        tax: '2.00',
        tip: '3.00',
        discount: '1.00',
        taxTipAllocation: 'proportional'
      })

      const totals = calculatePersonTotals(bill)

      expect(totals).toHaveLength(2)
      
      // Each person pays $10 for the item
      expectCurrencyToBe(totals[0].subtotal, 10.00)
      expectCurrencyToBe(totals[1].subtotal, 10.00)
      
      // Tax, tip, and discount split proportionally (50/50)
      expectCurrencyToBe(totals[0].tax, 1.00)
      expectCurrencyToBe(totals[0].tip, 1.50)
      expectCurrencyToBe(totals[0].discount, 0.50)
      
      expectCurrencyToBe(totals[1].tax, 1.00)
      expectCurrencyToBe(totals[1].tip, 1.50)
      expectCurrencyToBe(totals[1].discount, 0.50)
      
      // Total should be subtotal + tax + tip - discount
      expectCurrencyToBe(totals[0].total, 12.00)
      expectCurrencyToBe(totals[1].total, 12.00)
    })

    it('should calculate person totals with even tax and tip distribution', () => {
      const person1 = createMockPerson({ id: '1', name: 'Alice' })
      const person2 = createMockPerson({ id: '2', name: 'Bob' })
      const person3 = createMockPerson({ id: '3', name: 'Charlie' })
      
      // Alice pays for expensive item, others split cheap item
      const expensiveItem = createMockItem({
        price: '30.00',
        splitWith: [person1.id]
      })
      
      const cheapItem = createMockItem({
        price: '6.00',
        splitWith: [person2.id, person3.id]
      })
      
      const bill = createMockBill({
        people: [person1, person2, person3],
        items: [expensiveItem, cheapItem],
        tax: '3.60', // $1.20 each
        tip: '7.20', // $2.40 each
        taxTipAllocation: 'even'
      })

      const totals = calculatePersonTotals(bill)

      // Subtotals
      expectCurrencyToBe(totals[0].subtotal, 30.00) // Alice
      expectCurrencyToBe(totals[1].subtotal, 3.00)  // Bob
      expectCurrencyToBe(totals[2].subtotal, 3.00)  // Charlie
      
      // Even tax and tip distribution
      totals.forEach(total => {
        expectCurrencyToBe(total.tax, 1.20)
        expectCurrencyToBe(total.tip, 2.40)
      })
    })

    it('should handle bills with no items', () => {
      const person1 = createMockPerson({ id: '1', name: 'Alice' })
      const bill = createMockBill({
        people: [person1],
        items: [],
      })

      const totals = calculatePersonTotals(bill)

      expect(totals).toHaveLength(1)
      expect(totals[0].subtotal).toBe(0)
      expect(totals[0].tax).toBe(0)
      expect(totals[0].tip).toBe(0)
      expect(totals[0].total).toBe(0)
    })
  })

  describe('getBillSummary', () => {
    it('should generate correct bill summary', () => {
      const person1 = createMockPerson({ id: '1', name: 'Alice' })
      const person2 = createMockPerson({ id: '2', name: 'Bob' })
      
      const item = createMockItem({
        price: '50.00',
        splitWith: [person1.id, person2.id]
      })
      
      const bill = createMockBill({
        people: [person1, person2],
        items: [item],
        tax: '5.00',
        tip: '10.00',
        discount: '2.50'
      })

      const summary = getBillSummary(bill)

      expectCurrencyToBe(summary.subtotal, 50.00)
      expectCurrencyToBe(summary.tax, 5.00)
      expectCurrencyToBe(summary.tip, 10.00)
      expectCurrencyToBe(summary.discount, 2.50)
      expectCurrencyToBe(summary.total, 62.50) // 50 + 5 + 10 - 2.5

      expect(summary.personTotals).toHaveLength(2)
    })
  })

  describe('getItemBreakdowns', () => {
    it('should generate item breakdowns', () => {
      const person1 = createMockPerson({ id: '1', name: 'Alice' })
      const person2 = createMockPerson({ id: '2', name: 'Bob' })
      
      const item1 = createMockItem({
        name: 'Pizza',
        price: '20.00',
        splitWith: [person1.id, person2.id]
      })
      
      const item2 = createMockItem({
        name: 'Drinks',
        price: '8.00',
        splitWith: [person1.id]
      })
      
      const bill = createMockBill({
        people: [person1, person2],
        items: [item1, item2]
      })

      const breakdowns = getItemBreakdowns(bill)

      expect(breakdowns).toHaveLength(2)
      
      expect(breakdowns[0].itemName).toBe('Pizza')
      expect(breakdowns[0].itemPrice).toBe(20.00)
      expectCurrencyToBe(breakdowns[0].splits[person1.id], 10.00)
      expectCurrencyToBe(breakdowns[0].splits[person2.id], 10.00)
      
      expect(breakdowns[1].itemName).toBe('Drinks')
      expect(breakdowns[1].itemPrice).toBe(8.00)
      expectCurrencyToBe(breakdowns[1].splits[person1.id], 8.00)
      expect(breakdowns[1].splits[person2.id]).toBeUndefined()
    })
  })
})