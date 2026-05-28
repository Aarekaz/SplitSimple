import { extractBillIdFromInput } from '@/lib/sharing'

describe('extractBillIdFromInput', () => {
  it('returns a raw bill ID unchanged', () => {
    expect(extractBillIdFromInput('1780007206455-yojajgt')).toBe('1780007206455-yojajgt')
  })

  it('extracts the bill ID from a full share URL', () => {
    expect(
      extractBillIdFromInput('https://splitsimple.anuragd.me/?bill=1780007206455-yojajgt')
    ).toBe('1780007206455-yojajgt')
  })

  it('extracts the bill ID from a query string fragment', () => {
    expect(extractBillIdFromInput('?bill=1780007206455-yojajgt')).toBe('1780007206455-yojajgt')
  })
})
