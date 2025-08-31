import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ItemRow } from '../ItemRow'
import { BillProvider } from '@/contexts/BillContext'
import type { Item, Person } from '@/contexts/BillContext'

// Mock the analytics hook
jest.mock('@/hooks/use-analytics', () => ({
  useBillAnalytics: () => ({
    trackItemAdded: jest.fn(),
    trackItemUpdated: jest.fn(),
    trackItemRemoved: jest.fn(),
    trackItemDuplicated: jest.fn(),
  }),
}))

const mockPeople: Person[] = [
  { id: '1', name: 'Alice', color: '#ff0000' },
  { id: '2', name: 'Bob', color: '#00ff00' },
]

const mockItem: Item = {
  id: 'item-1',
  name: 'Test Item',
  price: '12.50',
  quantity: 1,
  splitWith: ['1', '2'],
  method: 'even',
  customSplits: {},
}

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BillProvider>{children}</BillProvider>
)

describe('ItemRow', () => {
  const defaultProps = {
    item: mockItem,
    people: mockPeople,
    onUpdate: jest.fn(),
    onDelete: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders item with name input', () => {
    render(
      <TestWrapper>
        <ItemRow {...defaultProps} />
      </TestWrapper>
    )

    expect(screen.getByDisplayValue('Test Item')).toBeInTheDocument()
    expect(screen.getByText('$12.50')).toBeInTheDocument()
    expect(screen.getByText('Edit')).toBeInTheDocument()
  })

  it('expands to show edit mode when Edit button clicked', async () => {
    const user = userEvent.setup()
    
    render(
      <TestWrapper>
        <ItemRow {...defaultProps} />
      </TestWrapper>
    )

    const editButton = screen.getByText('Edit')
    await user.click(editButton)

    expect(screen.getByText('Less')).toBeInTheDocument()
    expect(screen.getByText('Price')).toBeInTheDocument()
    expect(screen.getByText('Split Method')).toBeInTheDocument()
  })

  it('handles item name change', async () => {
    const user = userEvent.setup()
    const onUpdate = jest.fn()

    render(
      <TestWrapper>
        <ItemRow {...defaultProps} onUpdate={onUpdate} />
      </TestWrapper>
    )

    const nameInput = screen.getByDisplayValue('Test Item') as HTMLInputElement
    
    // Directly change the input value using fireEvent
    fireEvent.change(nameInput, { target: { value: 'New Name' } })

    // Check that onUpdate was called
    expect(onUpdate).toHaveBeenCalled()
    
    // Check the final call contains the new name
    const lastCall = onUpdate.mock.calls[onUpdate.mock.calls.length - 1][0]
    expect(lastCall.name).toBe('New Name')
  })

  it('handles price change in expanded mode', async () => {
    const user = userEvent.setup()
    const onUpdate = jest.fn()

    render(
      <TestWrapper>
        <ItemRow {...defaultProps} onUpdate={onUpdate} />
      </TestWrapper>
    )

    // Expand the item first
    const editButton = screen.getByText('Edit')
    await user.click(editButton)

    const priceInput = screen.getByPlaceholderText('0.00 or 7.48/2')
    await user.clear(priceInput)
    await user.type(priceInput, '15.75')

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledWith({
        ...mockItem,
        price: '15.75',
      })
    })
  })

  it('handles delete button click', () => {
    const onDelete = jest.fn()

    render(
      <TestWrapper>
        <ItemRow {...defaultProps} onDelete={onDelete} />
      </TestWrapper>
    )

    const deleteButton = screen.getByRole('button', { name: /delete item/i })
    fireEvent.click(deleteButton)

    expect(onDelete).toHaveBeenCalledWith('item-1')
  })

  it('displays person split indicators', () => {
    render(
      <TestWrapper>
        <ItemRow {...defaultProps} />
      </TestWrapper>
    )

    // Should show colored dots for split people
    const aliceDot = screen.getByTitle(/Alice: \$6\.25/)
    const bobDot = screen.getByTitle(/Bob: \$6\.25/)
    
    expect(aliceDot).toBeInTheDocument()
    expect(bobDot).toBeInTheDocument()
  })

  it('shows split method selector when expanded', async () => {
    const user = userEvent.setup()

    render(
      <TestWrapper>
        <ItemRow {...defaultProps} />
      </TestWrapper>
    )

    const editButton = screen.getByText('Edit')
    await user.click(editButton)

    expect(screen.getByText('Split Method')).toBeInTheDocument()
    expect(screen.getByText('Even Split')).toBeInTheDocument()
  })
})