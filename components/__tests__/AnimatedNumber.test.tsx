import React from 'react'
import { render, screen, act } from '@testing-library/react'
import { AnimatedNumber } from '../AnimatedNumber'

// Mock requestAnimationFrame
const mockRequestAnimationFrame = jest.fn()
const mockCancelAnimationFrame = jest.fn()

Object.defineProperty(window, 'requestAnimationFrame', {
  value: mockRequestAnimationFrame,
  writable: true,
})

Object.defineProperty(window, 'cancelAnimationFrame', {
  value: mockCancelAnimationFrame,
  writable: true,
})

describe('AnimatedNumber', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequestAnimationFrame.mockImplementation((cb) => {
      setTimeout(cb, 16) // ~60fps
      return 1
    })
  })

  afterEach(() => {
    jest.clearAllTimers()
  })

  it('renders initial value immediately', () => {
    render(<AnimatedNumber value={100} />)
    expect(screen.getByText('100.00')).toBeInTheDocument()
  })

  it('formats currency by default', () => {
    render(<AnimatedNumber value={123.456} />)
    expect(screen.getByText('123.46')).toBeInTheDocument()
  })

  it('applies custom formatting', () => {
    const customFormat = (num: number) => `$${num.toFixed(1)}`
    render(<AnimatedNumber value={99.99} formatFn={customFormat} />)
    expect(screen.getByText('$99.9')).toBeInTheDocument()
  })

  it('updates display value when value changes', async () => {
    const { rerender } = render(<AnimatedNumber value={0} />)
    expect(screen.getByText('0.00')).toBeInTheDocument()

    // Change value - should eventually show new value
    rerender(<AnimatedNumber value={100} />)
    
    // Wait for animation to settle
    await new Promise(resolve => setTimeout(resolve, 300))
    
    expect(screen.getByText('100.00')).toBeInTheDocument()
  })

  it('handles negative values', () => {
    render(<AnimatedNumber value={-50.25} />)
    expect(screen.getByText('-50.25')).toBeInTheDocument()
  })

  it('handles zero value', () => {
    render(<AnimatedNumber value={0} />)
    expect(screen.getByText('0.00')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(<AnimatedNumber value={100} className="custom-class" />)
    const element = screen.getByText('100.00')
    expect(element).toHaveClass('custom-class')
  })

  it('applies custom duration', async () => {
    jest.useFakeTimers()
    
    const { rerender } = render(<AnimatedNumber value={0} duration={2000} />)
    rerender(<AnimatedNumber value={100} duration={2000} />)

    // Complete animation
    act(() => {
      jest.advanceTimersByTime(3000) // Give extra time
    })

    // Should eventually reach target value
    const finalText = screen.getByText(/\d+\.\d{2}/).textContent
    expect(parseFloat(finalText || '0')).toBeCloseTo(100, 0)

    jest.useRealTimers()
  })

  it('handles rapid value changes', async () => {
    jest.useFakeTimers()
    
    const { rerender } = render(<AnimatedNumber value={0} />)
    
    // Rapid changes
    rerender(<AnimatedNumber value={50} />)
    rerender(<AnimatedNumber value={100} />)
    rerender(<AnimatedNumber value={75} />)

    // Should eventually settle on final value
    act(() => {
      jest.advanceTimersByTime(2000)
    })

    expect(screen.getByText('75.00')).toBeInTheDocument()

    jest.useRealTimers()
  })

  it('preserves accessibility', () => {
    render(<AnimatedNumber value={123.45} />)
    const element = screen.getByText('123.45')
    expect(element.tagName).toBe('SPAN')
  })

  it('handles very large numbers', () => {
    render(<AnimatedNumber value={999999.99} />)
    expect(screen.getByText('999999.99')).toBeInTheDocument()
  })

  it('handles very small numbers', () => {
    render(<AnimatedNumber value={0.01} />)
    expect(screen.getByText('0.01')).toBeInTheDocument()
  })

  it('handles component unmount gracefully', () => {
    const { unmount } = render(<AnimatedNumber value={100} />)
    expect(() => unmount()).not.toThrow()
  })
})