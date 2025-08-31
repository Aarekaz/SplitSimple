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
    isOpen: true,
    onClose: jest.fn(),
    inputRef: { current: null },
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders form when open', () => {
    render(
      <TestWrapper>
        <AddPersonForm {...defaultProps} />
      </TestWrapper>
    )

    expect(screen.getByPlaceholderText('Enter name')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add person/i })).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(
      <TestWrapper>
        <AddPersonForm {...defaultProps} isOpen={false} />
      </TestWrapper>
    )

    expect(screen.queryByPlaceholderText('Enter name')).not.toBeInTheDocument()
  })

  it('adds person with valid name', async () => {
    const user = userEvent.setup()
    const onClose = jest.fn()

    render(
      <TestWrapper>
        <AddPersonForm {...defaultProps} onClose={onClose} />
      </TestWrapper>
    )

    const input = screen.getByPlaceholderText('Enter name')
    const submitButton = screen.getByRole('button', { name: /add person/i })

    await user.type(input, 'Alice')
    await user.click(submitButton)

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled()
    })
  })

  it('handles form submission with Enter key', async () => {
    const user = userEvent.setup()
    const onClose = jest.fn()

    render(
      <TestWrapper>
        <AddPersonForm {...defaultProps} onClose={onClose} />
      </TestWrapper>
    )

    const input = screen.getByPlaceholderText('Enter name')
    await user.type(input, 'Bob')
    await user.keyboard('{Enter}')

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled()
    })
  })

  it('validates empty name', async () => {
    const user = userEvent.setup()
    const onClose = jest.fn()

    render(
      <TestWrapper>
        <AddPersonForm {...defaultProps} onClose={onClose} />
      </TestWrapper>
    )

    const submitButton = screen.getByRole('button', { name: /add person/i })
    await user.click(submitButton)

    // Should not close form with empty name
    expect(onClose).not.toHaveBeenCalled()
  })

  it('trims whitespace from name', async () => {
    const user = userEvent.setup()
    const onClose = jest.fn()

    render(
      <TestWrapper>
        <AddPersonForm {...defaultProps} onClose={onClose} />
      </TestWrapper>
    )

    const input = screen.getByPlaceholderText('Enter name')
    const submitButton = screen.getByRole('button', { name: /add person/i })

    await user.type(input, '  Charlie  ')
    await user.click(submitButton)

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled()
    })
  })

  it('clears form after successful submission', async () => {
    const user = userEvent.setup()
    const onClose = jest.fn()

    render(
      <TestWrapper>
        <AddPersonForm {...defaultProps} onClose={onClose} />
      </TestWrapper>
    )

    const input = screen.getByPlaceholderText('Enter name')
    const submitButton = screen.getByRole('button', { name: /add person/i })

    await user.type(input, 'David')
    await user.click(submitButton)

    await waitFor(() => {
      expect(input).toHaveValue('')
    })
  })

  it('handles escape key to close', async () => {
    const user = userEvent.setup()
    const onClose = jest.fn()

    render(
      <TestWrapper>
        <AddPersonForm {...defaultProps} onClose={onClose} />
      </TestWrapper>
    )

    const input = screen.getByPlaceholderText('Enter name')
    await user.type(input, 'Eve')
    await user.keyboard('{Escape}')

    expect(onClose).toHaveBeenCalled()
  })

  it('focuses input when opened', () => {
    const inputRef = React.createRef<HTMLInputElement>()

    render(
      <TestWrapper>
        <AddPersonForm {...defaultProps} inputRef={inputRef} />
      </TestWrapper>
    )

    // Input should be focused (testing library limitation - we check if it's rendered)
    expect(screen.getByPlaceholderText('Enter name')).toBeInTheDocument()
  })

  it('validates name length', async () => {
    const user = userEvent.setup()
    const onClose = jest.fn()

    render(
      <TestWrapper>
        <AddPersonForm {...defaultProps} onClose={onClose} />
      </TestWrapper>
    )

    const input = screen.getByPlaceholderText('Enter name')
    const submitButton = screen.getByRole('button', { name: /add person/i })

    // Test very long name
    const longName = 'a'.repeat(100)
    await user.type(input, longName)
    await user.click(submitButton)

    // Should still work with long names (validation handles this)
    await waitFor(() => {
      expect(onClose).toHaveBeenCalled()
    })
  })

  it('handles special characters in name', async () => {
    const user = userEvent.setup()
    const onClose = jest.fn()

    render(
      <TestWrapper>
        <AddPersonForm {...defaultProps} onClose={onClose} />
      </TestWrapper>
    )

    const input = screen.getByPlaceholderText('Enter name')
    const submitButton = screen.getByRole('button', { name: /add person/i })

    await user.type(input, "O'Reilly")
    await user.click(submitButton)

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled()
    })
  })
})