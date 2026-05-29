import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BillSourceIndicator } from '@/components/BillSourceIndicator'
import { ShareBill } from '@/components/ShareBill'
import { createMockBill } from '@/tests/utils/test-utils'
import { useBill } from '@/contexts/BillContext'
import { useRouter } from 'next/navigation'
import { storeBillInCloud, generateCloudShareUrl } from '@/lib/sharing'

jest.mock('@/contexts/BillContext', () => ({
  useBill: jest.fn(),
}))

const mockPush = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}))

jest.mock('@/hooks/use-analytics', () => ({
  useBillAnalytics: () => ({
    trackShareBillClicked: jest.fn(),
    trackFeatureUsed: jest.fn(),
    trackError: jest.fn(),
  }),
}))

jest.mock('@/lib/sharing', () => {
  const actual = jest.requireActual('@/lib/sharing')

  return {
    ...actual,
    storeBillInCloud: jest.fn(),
    generateCloudShareUrl: jest.fn(),
  }
})

const mockedUseBill = jest.mocked(useBill)
const mockedUseRouter = jest.mocked(useRouter)
const mockedStoreBillInCloud = jest.mocked(storeBillInCloud)
const mockedGenerateCloudShareUrl = jest.mocked(generateCloudShareUrl)

function createMockRouter() {
  return {
    push: mockPush,
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }
}

function mockBillState(overrides: Partial<ReturnType<typeof createMockBill>> = {}, billSource: 'draft' | 'shared' | 'shared_copy' = 'draft', sharedOriginBillId: string | null = null) {
  mockedUseBill.mockReturnValue({
    state: {
      currentBill: createMockBill(overrides),
      billSource,
      sharedOriginBillId,
      syncStatus: 'never_synced',
      lastSyncTime: null,
      history: [],
      historyIndex: -1,
      maxHistorySize: 50,
    },
    dispatch: jest.fn(),
    canUndo: false,
    canRedo: false,
    syncToCloud: jest.fn(),
  })
}

describe('BillSourceIndicator', () => {
  beforeEach(() => {
    mockPush.mockReset()
    mockedUseRouter.mockReturnValue(createMockRouter() as unknown as ReturnType<typeof useRouter>)
  })

  it('shows a forked shared-bill label and reload action for local copies', () => {
    mockBillState({ id: 'forked-bill-id' }, 'shared_copy', 'shared-bill-id')

    render(<BillSourceIndicator />)

    expect(screen.getByText('Forked from shared bill')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reload original/i })).toBeInTheDocument()
  })

  it('reopens the original shared bill from a forked copy', async () => {
    const user = userEvent.setup()
    mockBillState({ id: 'forked-bill-id' }, 'shared_copy', 'shared-bill-id')

    render(<BillSourceIndicator />)

    await user.click(screen.getByRole('button', { name: /reload original/i }))

    expect(mockPush).toHaveBeenCalledWith('/b/shared-bill-id', { scroll: false })
  })

  it('keeps the shared bill indicator simple when viewing the original', () => {
    mockBillState({ id: 'shared-bill-id' }, 'shared', 'shared-bill-id')

    render(<BillSourceIndicator />)

    expect(screen.getByText('Viewing shared bill')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /reload original/i })).not.toBeInTheDocument()
  })
})

describe('ShareBill', () => {
  beforeEach(() => {
    mockedUseRouter.mockReturnValue(createMockRouter() as unknown as ReturnType<typeof useRouter>)
    mockedStoreBillInCloud.mockResolvedValue({ success: true })
    mockedGenerateCloudShareUrl.mockImplementation((billId: string) => `https://splitsimple.app/b/${billId}`)
  })

  it('updates the trigger label for shared copies', () => {
    mockBillState({ id: 'forked-bill-id', title: 'Edited Bill' }, 'shared_copy', 'shared-bill-id')

    render(<ShareBill />)

    expect(screen.getByRole('button', { name: /share updated copy/i })).toBeInTheDocument()
  })

  it('explains that sharing a fork keeps the original untouched', async () => {
    const user = userEvent.setup()
    mockBillState({ id: 'forked-bill-id', title: 'Edited Bill' }, 'shared_copy', 'shared-bill-id')

    render(<ShareBill />)

    await user.click(screen.getByRole('button', { name: /share updated copy/i }))

    expect(await screen.findByText(/original shared bill stays unchanged/i)).toBeInTheDocument()
  })
})
