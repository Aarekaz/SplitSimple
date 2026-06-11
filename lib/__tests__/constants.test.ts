import { STORAGE } from '@/lib/constants'

describe('shared bill storage constants', () => {
  it('keeps shared bills available for one year by default', () => {
    expect(STORAGE.BILL_TTL_SECONDS).toBe(365 * 24 * 60 * 60)
  })
})
