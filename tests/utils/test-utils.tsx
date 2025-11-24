import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { BillProvider } from '@/contexts/BillContext'
import type { Bill, Person, Item } from '@/contexts/BillContext'

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

// Common test scenarios
export const createBillWithPeopleAndItems = (): Bill => {
  const person1 = createMockPerson({ name: 'Alice', color: '#6366f1' })
  const person2 = createMockPerson({ name: 'Bob', color: '#d97706' })
  
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

  return createMockBill({
    title: 'Restaurant Bill',
    people: [person1, person2],
    items: [item1, item2],
    tax: '2.50',
    tip: '5.00',
  })
}

// Custom matchers
export const expectCurrencyToBe = (actual: number, expected: number) => {
  // Use toBeCloseTo for currency comparisons to handle floating point precision
  expect(actual).toBeCloseTo(expected, 2)
}

// Mock user events helpers
export const createMockKeyboardEvent = (key: string, options: Partial<KeyboardEvent> = {}): KeyboardEvent => {
  return new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...options,
  })
}

// Async utility for waiting for API calls
export const waitForApiCall = async (timeout = 1000) => {
  await new Promise(resolve => setTimeout(resolve, timeout))
}
