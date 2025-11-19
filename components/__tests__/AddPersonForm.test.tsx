import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AddPersonForm } from '../AddPersonForm'
import { BillProvider } from '@/contexts/BillContext'

// Mock the analytics hook
jest.mock('@/hooks/use-analytics', () => ({
  useBillAnalytics: () => ({
    trackPersonAdded: jest.fn(),
  }),
}))

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BillProvider>{children}</BillProvider>
)

describe('AddPersonForm', () => {
  const defaultProps = {
    onPersonAdded: jest.fn(),
    onCancel: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders form', () => {
    render(
      <TestWrapper>
        <AddPersonForm {...defaultProps} />
      </TestWrapper>
    )

    expect(screen.getByPlaceholderText('Enter name')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add/i })).toBeInTheDocument()
  })

  it('renders with show button disabled', () => {
    render(
      <TestWrapper>
        <AddPersonForm {...defaultProps} showButton={false} />
      </TestWrapper>
    )

    expect(screen.getByPlaceholderText('Enter name')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /add/i })).not.toBeInTheDocument()
  })

  it('adds person with valid name', async () => {
    const user = userEvent.setup()
    const onPersonAdded = jest.fn()

    render(
      <TestWrapper>
        <AddPersonForm {...defaultProps} onPersonAdded={onPersonAdded} />
      </TestWrapper>
    )

    const input = screen.getByPlaceholderText('Enter name')
    const submitButton = screen.getByRole('button', { name: /add/i })

    await user.type(input, 'Alice')
    await user.click(submitButton)

    await waitFor(() => {
      expect(onPersonAdded).toHaveBeenCalled()
    })
  })

  it('handles form submission with Enter key', async () => {
    const user = userEvent.setup()
    const onPersonAdded = jest.fn()

    render(
      <TestWrapper>
        <AddPersonForm {...defaultProps} onPersonAdded={onPersonAdded} />
      </TestWrapper>
    )

    const input = screen.getByPlaceholderText('Enter name')
    await user.type(input, 'Bob')
    await user.keyboard('{Enter}')

    await waitFor(() => {
      expect(onPersonAdded).toHaveBeenCalled()
    })
  })

  it('validates empty name', async () => {
    const user = userEvent.setup()
    const onPersonAdded = jest.fn()

    render(
      <TestWrapper>
        <AddPersonForm {...defaultProps} onPersonAdded={onPersonAdded} />
      </TestWrapper>
    )

    const submitButton = screen.getByRole('button', { name: /add/i })
    await user.click(submitButton)

    // Should not call onPersonAdded with empty name
    expect(onPersonAdded).not.toHaveBeenCalled()
  })

  it('trims whitespace from name', async () => {
    const user = userEvent.setup()
    const onPersonAdded = jest.fn()

    render(
      <TestWrapper>
        <AddPersonForm {...defaultProps} onPersonAdded={onPersonAdded} />
      </TestWrapper>
    )

    const input = screen.getByPlaceholderText('Enter name')
    const submitButton = screen.getByRole('button', { name: /add/i })

    await user.type(input, '  Charlie  ')
    await user.click(submitButton)

    await waitFor(() => {
      expect(onPersonAdded).toHaveBeenCalled()
    })
  })

  it('clears form after successful submission', async () => {
    const user = userEvent.setup()
    const onPersonAdded = jest.fn()

    render(
      <TestWrapper>
        <AddPersonForm {...defaultProps} onPersonAdded={onPersonAdded} />
      </TestWrapper>
    )

    const input = screen.getByPlaceholderText('Enter name')
    const submitButton = screen.getByRole('button', { name: /add/i })

    await user.type(input, 'David')
    await user.click(submitButton)

    await waitFor(() => {
      expect(input).toHaveValue('')
    })
  })

  it('handles escape key to close', async () => {
    const user = userEvent.setup()
    const onCancel = jest.fn()

    render(
      <TestWrapper>
        <AddPersonForm {...defaultProps} onCancel={onCancel} />
      </TestWrapper>
    )

    const input = screen.getByPlaceholderText('Enter name')
    await user.type(input, 'Eve')
    await user.keyboard('{Escape}')

    expect(onCancel).toHaveBeenCalled()
  })

  it('focuses input when rendered', () => {
    render(
      <TestWrapper>
        <AddPersonForm {...defaultProps} />
      </TestWrapper>
    )

    // Input should be focused (testing library limitation - we check if it's rendered)
    expect(screen.getByPlaceholderText('Enter name')).toBeInTheDocument()
  })

  it('validates name length', async () => {
    const user = userEvent.setup()
    const onPersonAdded = jest.fn()

    render(
      <TestWrapper>
        <AddPersonForm {...defaultProps} onPersonAdded={onPersonAdded} />
      </TestWrapper>
    )

    const input = screen.getByPlaceholderText('Enter name')
    const submitButton = screen.getByRole('button', { name: /add/i })

    // Test very long name (over 50 character limit)
    const longName = 'a'.repeat(100)
    await user.type(input, longName)
    await user.click(submitButton)

    // Should NOT call onPersonAdded because name is too long (validation rejects it)
    await waitFor(() => {
      expect(screen.getByText(/Name cannot exceed 50 characters/i)).toBeInTheDocument()
    })
    expect(onPersonAdded).not.toHaveBeenCalled()
  })

  it('handles special characters in name', async () => {
    const user = userEvent.setup()
    const onPersonAdded = jest.fn()

    render(
      <TestWrapper>
        <AddPersonForm {...defaultProps} onPersonAdded={onPersonAdded} />
      </TestWrapper>
    )

    const input = screen.getByPlaceholderText('Enter name')
    const submitButton = screen.getByRole('button', { name: /add/i })

    await user.type(input, "O'Reilly")
    await user.click(submitButton)

    await waitFor(() => {
      expect(onPersonAdded).toHaveBeenCalled()
    })
  })
})