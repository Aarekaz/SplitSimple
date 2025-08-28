import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { PersonChip } from '../PersonChip'
import type { Person } from '@/contexts/BillContext'

const mockPerson: Person = {
  id: '1',
  name: 'Alice',
  color: '#ff0000',
}

describe('PersonChip', () => {
  it('renders person name', () => {
    render(<PersonChip person={mockPerson} />)
    expect(screen.getByText('Alice')).toBeInTheDocument()
  })

  it('applies person color to color dot', () => {
    render(<PersonChip person={mockPerson} />)
    const colorDot = screen.getByText('Alice').parentElement?.querySelector('div[style*="background-color"]')
    expect(colorDot).toHaveStyle({ backgroundColor: '#ff0000' })
  })

  it('renders remove button when onRemove provided', () => {
    const onRemove = jest.fn()
    render(<PersonChip person={mockPerson} onRemove={onRemove} />)
    
    const removeButton = screen.getByRole('button')
    expect(removeButton).toBeInTheDocument()
  })

  it('calls onRemove when remove button clicked', () => {
    const onRemove = jest.fn()
    render(<PersonChip person={mockPerson} onRemove={onRemove} />)
    
    const removeButton = screen.getByRole('button')
    fireEvent.click(removeButton)
    
    expect(onRemove).toHaveBeenCalledWith('1')
  })

  it('does not render remove button when onRemove not provided', () => {
    render(<PersonChip person={mockPerson} />)
    
    const buttons = screen.queryAllByRole('button')
    expect(buttons).toHaveLength(0)
  })

  it('renders with small size variant', () => {
    render(<PersonChip person={mockPerson} size="sm" />)
    const chip = screen.getByText('Alice').parentElement
    expect(chip).toHaveClass('text-xs', 'px-2', 'py-0.5', 'h-6')
  })

  it('renders with medium size variant (default)', () => {
    render(<PersonChip person={mockPerson} />)
    const chip = screen.getByText('Alice').parentElement
    expect(chip).toHaveClass('text-sm', 'px-3', 'py-1.5')
  })

  it('handles long names gracefully', () => {
    const longNamePerson: Person = {
      id: '2',
      name: 'This is a very long person name that should be handled properly',
      color: '#00ff00',
    }
    
    render(<PersonChip person={longNamePerson} />)
    expect(screen.getByText(longNamePerson.name)).toBeInTheDocument()
  })

  it('handles special characters in name', () => {
    const specialCharsPerson: Person = {
      id: '3',
      name: "O'Reilly & Co.",
      color: '#0000ff',
    }
    
    render(<PersonChip person={specialCharsPerson} />)
    expect(screen.getByText("O'Reilly & Co.")).toBeInTheDocument()
  })
})