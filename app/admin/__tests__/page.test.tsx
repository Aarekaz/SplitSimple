import userEvent from '@testing-library/user-event'
import { render, screen, waitFor } from '@/tests/utils/test-utils'
import AdminPage from '@/app/admin/page'
import type { AdminBillMetadata, AdminStats, Bill } from '@/lib/bill-types'

const mockToast = jest.fn()
const mockPush = jest.fn()

jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}))

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
}))

function createBill(overrides: Partial<Bill> = {}): Bill {
  return {
    id: 'bill-1',
    title: 'Weekly Dinner',
    status: 'active',
    tax: '0',
    tip: '0',
    discount: '0',
    taxTipAllocation: 'proportional',
    notes: '',
    people: [],
    items: [],
    ...overrides,
  }
}

function createAdminStats(overrides: Partial<AdminStats> = {}): AdminStats {
  return {
    totalBills: 1,
    activeBills: 1,
    draftBills: 0,
    closedBills: 0,
    totalItems: 2,
    totalPeople: 3,
    totalStorageSize: 1024,
    averageBillSize: 1024,
    totalMoneyProcessed: 24,
    averageBillValue: 24,
    medianBillValue: 24,
    largestBill: 24,
    smallestBill: 24,
    subtotalRevenue: 24,
    taxRevenue: 0,
    tipRevenue: 0,
    totalTaxCollected: 0,
    totalTipsProcessed: 0,
    totalDiscountsApplied: 0,
    billsWithTax: 0,
    billsWithTips: 0,
    billsWithDiscounts: 0,
    billsCreatedToday: 1,
    billsCreatedThisWeek: 1,
    billsCreatedThisMonth: 1,
    billsCreatedLastWeek: 0,
    billsCreatedLastMonth: 0,
    weeklyGrowth: 100,
    monthlyGrowth: 100,
    completionRate: 100,
    shareRate: 100,
    averageAccessCount: 1,
    sharedBills: 1,
    completedBills: 1,
    averageItemsPerBill: 2,
    averagePeoplePerBill: 3,
    complexBills: 0,
    largeBills: 0,
    popularSplitMethods: [{ method: 'even', count: 1, percentage: 100 }],
    ...overrides,
  }
}

function createAdminBill(overrides: Partial<AdminBillMetadata> = {}): AdminBillMetadata {
  return {
    id: 'bill-1',
    bill: createBill(),
    createdAt: '2026-05-29T00:00:00.000Z',
    lastModified: '2026-05-29T00:00:00.000Z',
    expiresAt: '2027-05-29T00:00:00.000Z',
    accessCount: 1,
    size: 512,
    shareUrl: 'https://splitsimple.example/b/bill-1',
    totalAmount: 24,
    lastAccessed: '2026-05-29T00:00:00.000Z',
    ...overrides,
  }
}

function createBillsResponse(overrides: Partial<{ bills: AdminBillMetadata[]; stats: AdminStats; pagination: { totalPages: number } }> = {}) {
  return {
    bills: [createAdminBill()],
    stats: createAdminStats(),
    pagination: { totalPages: 1 },
    ...overrides,
  }
}

function createFetchResponse(status: number, body?: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(body),
    blob: jest.fn().mockResolvedValue(new Blob()),
  } as unknown as Response
}

describe('AdminPage', () => {
  beforeEach(() => {
    mockToast.mockReset()
    mockPush.mockReset()
    global.fetch = jest.fn()
  })

  it('returns to the login screen when the admin session expires during bill fetch', async () => {
    jest.mocked(global.fetch)
      .mockResolvedValueOnce(createFetchResponse(200))
      .mockResolvedValueOnce(createFetchResponse(401, { error: 'Unauthorized' }))

    render(<AdminPage />)

    expect(await screen.findByText('Admin Access')).toBeInTheDocument()
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Session expired',
      })
    )
  })

  it('shows an empty state instead of a blank table when no bills are returned', async () => {
    jest.mocked(global.fetch)
      .mockResolvedValueOnce(createFetchResponse(200))
      .mockResolvedValueOnce(
        createFetchResponse(200, createBillsResponse({ bills: [], stats: createAdminStats({ totalBills: 0, activeBills: 0, sharedBills: 0, totalItems: 0, totalPeople: 0, totalMoneyProcessed: 0, averageBillValue: 0, medianBillValue: 0, largestBill: 0, smallestBill: 0, subtotalRevenue: 0, averageBillSize: 0, averageAccessCount: 0, completionRate: 0, shareRate: 0, averageItemsPerBill: 0, averagePeoplePerBill: 0, completedBills: 0 }), pagination: { totalPages: 0 } }))
      )

    render(<AdminPage />)

    expect(await screen.findByText(/no bills found/i)).toBeInTheDocument()
    expect(screen.getByText(/try changing your search or filters/i)).toBeInTheDocument()
    expect(screen.getByText('Page 1 of 1')).toBeInTheDocument()
  })

  it('requests a supported backend sort key when sorting by total amount', async () => {
    const user = userEvent.setup()

    jest.mocked(global.fetch)
      .mockResolvedValueOnce(createFetchResponse(200))
      .mockResolvedValueOnce(createFetchResponse(200, createBillsResponse()))
      .mockResolvedValueOnce(createFetchResponse(200, createBillsResponse()))

    render(<AdminPage />)

    await screen.findByText('Bills Command Center')

    await user.selectOptions(screen.getByLabelText(/sort by/i), 'total')

    await waitFor(() => {
      const lastCallUrl = jest.mocked(global.fetch).mock.calls.at(-1)?.[0]
      expect(lastCallUrl).toEqual(expect.stringContaining('sortBy=total'))
    })
  })
})
