import React from 'react'
import { render, screen } from '../../tests/utils/test-utils'
import { TotalsPanel } from '../TotalsPanel'

describe('TotalsPanel', () => {
  const defaultProps = {
    isAddingPerson: false,
    setIsAddingPerson: jest.fn(),
    personInputRef: { current: null },
  }

  // Simple smoke test to verify component renders without crashing
  it('should render without crashing', () => {
    render(<TotalsPanel {...defaultProps} />)
    // If we get here, the component rendered successfully
    expect(document.body).toBeInTheDocument()
  })

  it('should render with adding person state', () => {
    render(<TotalsPanel {...defaultProps} isAddingPerson={true} />)
    expect(document.body).toBeInTheDocument()
  })

  it('should render in compact mode', () => {
    render(<TotalsPanel {...defaultProps} compact={true} />)
    expect(document.body).toBeInTheDocument()
  })
})