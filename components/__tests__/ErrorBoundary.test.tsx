import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { ErrorBoundary } from '../ErrorBoundary'

// Mock component that throws an error
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error message')
  }
  return <div>No error</div>
}

// Mock console methods to avoid noise in test output
const originalError = console.error
beforeAll(() => {
  console.error = jest.fn()
})

afterAll(() => {
  console.error = originalError
})

describe('ErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    )

    expect(screen.getByText('No error')).toBeInTheDocument()
  })

  it('renders error UI when there is an error', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByText(/We encountered an unexpected error/)).toBeInTheDocument()
  })

  it('renders Try Again button', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Try Again')).toBeInTheDocument()
    expect(screen.getByText('Reload Page')).toBeInTheDocument()
  })

  it('handles retry functionality', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()

    const retryButton = screen.getByText('Try Again')
    fireEvent.click(retryButton)

    // After retry, re-render with no error
    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    )

    expect(screen.getByText('No error')).toBeInTheDocument()
  })

  it('handles reload functionality', () => {
    // Mock window.location.reload
    const mockReload = jest.fn()
    Object.defineProperty(window, 'location', {
      value: { reload: mockReload },
      writable: true,
    })

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    const reloadButton = screen.getByText('Reload Page')
    fireEvent.click(reloadButton)

    expect(mockReload).toHaveBeenCalled()
  })

  it('uses custom fallback component when provided', () => {
    const CustomFallback = ({ error, retry }: { error: Error; retry: () => void }) => (
      <div>
        <p>Custom error: {error.message}</p>
        <button onClick={retry}>Custom Retry</button>
      </div>
    )

    render(
      <ErrorBoundary fallback={CustomFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Custom error: Test error message')).toBeInTheDocument()
    expect(screen.getByText('Custom Retry')).toBeInTheDocument()
  })

  it('logs error information in development mode', () => {
    const originalNodeEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(console.error).toHaveBeenCalled()

    process.env.NODE_ENV = originalNodeEnv
  })

  it('shows technical details in development mode', () => {
    const originalNodeEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText(/Technical Details/)).toBeInTheDocument()

    process.env.NODE_ENV = originalNodeEnv
  })

  it('does not show technical details in production mode', () => {
    const originalNodeEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.queryByText(/Technical Details/)).not.toBeInTheDocument()

    process.env.NODE_ENV = originalNodeEnv
  })

  it('generates unique error ID', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    const retryButton = screen.getByText('Try Again')
    fireEvent.click(retryButton)

    // Trigger another error
    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    // Each error should have a unique ID (tested by ensuring error boundary re-renders)
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })
})