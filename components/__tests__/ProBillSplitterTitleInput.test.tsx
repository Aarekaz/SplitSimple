import userEvent from '@testing-library/user-event'
import { render, screen, waitFor } from '@/tests/utils/test-utils'
import { ProBillSplitter } from '@/components/ProBillSplitter'
import { createMockBill, createMockItem } from '@/tests/utils/test-utils'
import { useBill } from '@/contexts/BillContext'

function BillStateProbe() {
  const { state } = useBill()

  return (
    <div>
      <output data-testid="probe-title">{state.currentBill.title}</output>
      <output data-testid="probe-first-item-name">{state.currentBill.items[0]?.name ?? ''}</output>
    </div>
  )
}

describe('ProBillSplitter bill title input', () => {
  it('does not start editing the selected ledger cell while typing in the bill title', async () => {
    const user = userEvent.setup()

    const bill = createMockBill({
      id: 'bill-title-bug',
      title: 'Dinner',
      items: [
        createMockItem({
          id: 'item-1',
          name: 'Pad Thai',
        }),
      ],
    })

    window.localStorage.getItem = jest.fn((key: string) => {
      if (key === 'splitSimple_currentBill') {
        return JSON.stringify(bill)
      }

      return null
    })

    render(
      <>
        <ProBillSplitter />
        <BillStateProbe />
      </>
    )

    const titleInput = await screen.findByRole('textbox', { name: /bill title/i })

    await waitFor(() => {
      expect(titleInput).toHaveValue('Dinner')
      expect(screen.getByTestId('probe-title')).toHaveTextContent('Dinner')
      expect(screen.getByTestId('probe-first-item-name')).toHaveTextContent('Pad Thai')
    })

    await user.click(titleInput)
    await user.type(titleInput, 'X')

    expect(titleInput).toHaveValue('DinnerX')
    expect(screen.getByTestId('probe-title')).toHaveTextContent('DinnerX')
    expect(screen.getByTestId('probe-first-item-name')).toHaveTextContent('Pad Thai')
    expect(screen.queryByLabelText(/edit name/i)).not.toBeInTheDocument()
  })
})
