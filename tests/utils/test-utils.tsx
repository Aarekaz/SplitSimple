import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { BillProvider } from '@/contexts/BillContext'
import type { Bill, Person, Item } from '@/lib/bill-types'

// Custom render function that includes all providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <BillProvider>
      {children}
    </BillProvider>
  )
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options })

export * from '@testing-library/react'
export { customRender as render }

// Test data factories
export const createMockPerson = (overrides: Partial<Person> = {}): Person => ({
  id: `person-${Math.random().toString(36).substr(2, 9)}`,
  name: 'Test Person',
  color: '#6366f1',
  ...overrides,
})

export const createMockItem = (overrides: Partial<Item> = {}): Item => ({
  id: `item-${Math.random().toString(36).substr(2, 9)}`,
  name: 'Test Item',
  price: '10.00',
  quantity: 1,
  splitWith: [],
  method: 'even',
  ...overrides,
})

export const createMockBill = (overrides: Partial<Bill> = {}): Bill => ({
  id: `bill-${Math.random().toString(36).substr(2, 9)}`,
  title: 'Test Bill',
  status: 'active',
  tax: '',
  tip: '',
  discount: '',
  taxTipAllocation: 'proportional',
  notes: '',
  people: [],
  items: [],
  ...overrides,
})

// Custom matchers
export const expectCurrencyToBe = (actual: number, expected: number) => {
  // Use toBeCloseTo for currency comparisons to handle floating point precision
  expect(actual).toBeCloseTo(expected, 2)
}
