import { extractBillIdFromInput, getSharedBillIdFromSearch, stripSharedBillParams } from '@/lib/sharing'

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

describe('shared bill search helpers', () => {
  it('reads the shared bill id from search params', () => {
    expect(getSharedBillIdFromSearch('?bill=1780007206455-yojajgt&view=breakdown')).toBe('1780007206455-yojajgt')
  })

  it('clears shared bill params while preserving unrelated params', () => {
    expect(stripSharedBillParams('bill=1780007206455-yojajgt&view=breakdown')).toBe('?view=breakdown')
    expect(stripSharedBillParams('?share=1780007206455-yojajgt')).toBe('')
  })
})
