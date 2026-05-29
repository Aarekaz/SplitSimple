import {
  buildSharedBillPath,
  extractBillIdFromInput,
  getSharedBillIdFromLocationParts,
  getSharedBillIdFromPathname,
  getSharedBillIdFromSearch,
  stripSharedBillLocation,
  stripSharedBillParams,
} from '@/lib/sharing'

describe('extractBillIdFromInput', () => {
  it('returns a raw bill ID unchanged', () => {
    expect(extractBillIdFromInput('1780007206455-yojajgt')).toBe('1780007206455-yojajgt')
  })

  it('extracts the bill ID from a full share URL', () => {
    expect(
      extractBillIdFromInput('https://splitsimple.anuragd.me/?bill=1780007206455-yojajgt')
    ).toBe('1780007206455-yojajgt')
  })

  it('extracts the bill ID from the dedicated shared route', () => {
    expect(
      extractBillIdFromInput('https://splitsimple.anuragd.me/b/1780007206455-yojajgt')
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

  it('reads the shared bill id from the dedicated shared path', () => {
    expect(getSharedBillIdFromPathname('/b/1780007206455-yojajgt')).toBe('1780007206455-yojajgt')
    expect(getSharedBillIdFromLocationParts('/b/1780007206455-yojajgt', '?view=breakdown')).toBe('1780007206455-yojajgt')
  })

  it('clears shared bill params while preserving unrelated params', () => {
    expect(stripSharedBillParams('bill=1780007206455-yojajgt&view=breakdown')).toBe('?view=breakdown')
    expect(stripSharedBillParams('?share=1780007206455-yojajgt')).toBe('')
  })

  it('strips shared bill route state back to the draft workspace', () => {
    expect(stripSharedBillLocation('/b/1780007206455-yojajgt', '?view=breakdown')).toBe('/?view=breakdown')
  })

  it('builds the dedicated shared bill path', () => {
    expect(buildSharedBillPath('1780007206455-yojajgt')).toBe('/b/1780007206455-yojajgt')
  })
})
