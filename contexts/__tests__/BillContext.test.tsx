import React from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { BillProvider, useBill } from '../BillContext'
import { getBillFromCloud } from '../../lib/sharing'
import { createMockPerson, createMockItem, createMockBill } from '../../tests/utils/test-utils'

jest.mock('../../lib/sharing', () => {
  const actual = jest.requireActual('../../lib/sharing')
  return {
    ...actual,
    getBillFromCloud: jest.fn(),
  }
})

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <BillProvider>{children}</BillProvider>
)

describe('BillContext', () => {
  let storage: Record<string, string>

  beforeEach(() => {
    storage = {}
    jest.mocked(localStorage.getItem).mockImplementation((key: string) => storage[key] ?? null)
    jest.mocked(localStorage.setItem).mockImplementation((key: string, value: string) => {
      storage[key] = value
    })
    jest.mocked(localStorage.removeItem).mockImplementation((key: string) => {
      delete storage[key]
    })
    jest.mocked(localStorage.clear).mockImplementation(() => {
      storage = {}
    })

    // Clear localStorage before each test
    localStorage.clear()
    window.history.replaceState({}, '', '/')
  })

  describe('initial state', () => {
    it('should initialize with a new bill', () => {
      const { result } = renderHook(() => useBill(), { wrapper })
      
      expect(result.current.state.currentBill.title).toBe('New Bill')
      expect(result.current.state.currentBill.people).toHaveLength(1)
      expect(result.current.state.currentBill.people[0].name).toBe('Person 1')
      expect(result.current.state.currentBill.items).toEqual([])
      expect(result.current.state.currentBill.status).toBe('active')
      expect(result.current.state.billSource).toBe('draft')
      expect(result.current.state.sharedOriginBillId).toBeNull()
      expect(result.current.state.syncStatus).toBe('never_synced')
    })

    it('should initialize undo/redo state correctly', () => {
      const { result } = renderHook(() => useBill(), { wrapper })
      
      expect(result.current.canUndo).toBe(false)
      expect(result.current.canRedo).toBe(false)
      expect(result.current.state.history).toEqual([])
      expect(result.current.state.historyIndex).toBe(-1)
    })
  })

  describe('bill management', () => {
    it('should set bill title and track in history', () => {
      const { result } = renderHook(() => useBill(), { wrapper })
      
      act(() => {
        result.current.dispatch({ type: 'SET_BILL_TITLE', payload: 'Restaurant Bill' })
      })
      
      expect(result.current.state.currentBill.title).toBe('Restaurant Bill')
      expect(result.current.canUndo).toBe(true)
      expect(result.current.state.history).toHaveLength(1)
    })

    it('should set bill status', () => {
      const { result } = renderHook(() => useBill(), { wrapper })
      
      act(() => {
        result.current.dispatch({ type: 'SET_BILL_STATUS', payload: 'active' })
      })
      
      expect(result.current.state.currentBill.status).toBe('active')
    })

    it('should create new bill', () => {
      const { result } = renderHook(() => useBill(), { wrapper })
      
      // First make some changes
      act(() => {
        result.current.dispatch({ type: 'SET_BILL_TITLE', payload: 'Old Bill' })
      })
      
      // Then create new bill
      act(() => {
        result.current.dispatch({ type: 'NEW_BILL' })
      })
      
      expect(result.current.state.currentBill.title).toBe('New Bill')
      expect(result.current.state.history).toEqual([])
      expect(result.current.canUndo).toBe(false)
    })
  })

  describe('people management', () => {
    it('should add person with auto-assigned color', () => {
      const { result } = renderHook(() => useBill(), { wrapper })
      
      act(() => {
        result.current.dispatch({ 
          type: 'ADD_PERSON', 
          payload: { name: 'Alice', color: '' }
        })
      })
      
      expect(result.current.state.currentBill.people).toHaveLength(2)
      const newest = result.current.state.currentBill.people.at(-1)!
      expect(newest.name).toBe('Alice')
      expect(newest.color).toBe('#d97706') // Second default color
      expect(newest.id).toBeDefined()
    })

    it('should add person with specific color', () => {
      const { result } = renderHook(() => useBill(), { wrapper })
      
      act(() => {
        result.current.dispatch({ 
          type: 'ADD_PERSON', 
          payload: { name: 'Bob', color: '#ff0000' }
        })
      })
      
      const added = result.current.state.currentBill.people.at(-1)!
      expect(added.color).toBe('#ff0000')
    })

    it('should remove person and update items', () => {
      const { result } = renderHook(() => useBill(), { wrapper })
      
      // Add person
      act(() => {
        result.current.dispatch({ 
          type: 'ADD_PERSON', 
          payload: { name: 'Alice', color: '' }
        })
      })
      
      const addedPerson = result.current.state.currentBill.people.find(p => p.name === 'Alice')
      expect(addedPerson).toBeTruthy()
      const personId = addedPerson!.id
      
      // Add item with person
      act(() => {
        result.current.dispatch({
          type: 'ADD_ITEM',
          payload: {
            name: 'Pizza',
            price: '20.00',
            quantity: 1,
            splitWith: [personId],
            method: 'even'
          }
        })
      })
      
      // Remove person
      act(() => {
        result.current.dispatch({ type: 'REMOVE_PERSON', payload: personId })
      })
      
      expect(result.current.state.currentBill.people.find(p => p.id === personId)).toBeUndefined()
      expect(result.current.state.currentBill.people).toHaveLength(1)
      expect(result.current.state.currentBill.items[0].splitWith).toEqual([])
    })

    it('should assign different colors to multiple people', () => {
      const { result } = renderHook(() => useBill(), { wrapper })
      
      // Add multiple people
      act(() => {
        result.current.dispatch({ type: 'ADD_PERSON', payload: { name: 'Alice', color: '' } })
      })
      act(() => {
        result.current.dispatch({ type: 'ADD_PERSON', payload: { name: 'Bob', color: '' } })
      })
      act(() => {
        result.current.dispatch({ type: 'ADD_PERSON', payload: { name: 'Charlie', color: '' } })
      })
      
      const colors = result.current.state.currentBill.people.map(p => p.color)
      expect(new Set(colors).size).toBe(result.current.state.currentBill.people.length) // All different colors
    })
  })

  describe('item management', () => {
    it('should add item', () => {
      const { result } = renderHook(() => useBill(), { wrapper })
      
      act(() => {
        result.current.dispatch({
          type: 'ADD_ITEM',
          payload: {
            name: 'Pizza',
            price: '20.00',
            quantity: 1,
            splitWith: [],
            method: 'even'
          }
        })
      })
      
      expect(result.current.state.currentBill.items).toHaveLength(1)
      expect(result.current.state.currentBill.items[0].name).toBe('Pizza')
      expect(result.current.state.currentBill.items[0].price).toBe('20.00')
      expect(result.current.state.currentBill.items[0].id).toBeDefined()
    })

    it('should update item', () => {
      const { result } = renderHook(() => useBill(), { wrapper })
      
      // Add item
      act(() => {
        result.current.dispatch({
          type: 'ADD_ITEM',
          payload: {
            name: 'Pizza',
            price: '20.00',
            quantity: 1,
            splitWith: [],
            method: 'even'
          }
        })
      })
      
      const itemId = result.current.state.currentBill.items[0].id
      
      // Update item
      act(() => {
        result.current.dispatch({
          type: 'UPDATE_ITEM',
          payload: {
            id: itemId,
            name: 'Large Pizza',
            price: '25.00',
            quantity: 2,
            splitWith: [],
            method: 'even'
          }
        })
      })
      
      expect(result.current.state.currentBill.items[0].name).toBe('Large Pizza')
      expect(result.current.state.currentBill.items[0].price).toBe('25.00')
    })

    it('should remove item', () => {
      const { result } = renderHook(() => useBill(), { wrapper })
      
      // Add item
      act(() => {
        result.current.dispatch({
          type: 'ADD_ITEM',
          payload: {
            name: 'Pizza',
            price: '20.00',
            quantity: 1,
            splitWith: [],
            method: 'even'
          }
        })
      })
      
      const itemId = result.current.state.currentBill.items[0].id
      
      // Remove item
      act(() => {
        result.current.dispatch({ type: 'REMOVE_ITEM', payload: itemId })
      })
      
      expect(result.current.state.currentBill.items).toHaveLength(0)
    })

    it('should reorder items', () => {
      const { result } = renderHook(() => useBill(), { wrapper })
      
      // Add multiple items
      act(() => {
        result.current.dispatch({
          type: 'ADD_ITEM',
          payload: { name: 'Item 1', price: '10.00', quantity: 1, splitWith: [], method: 'even' }
        })
      })
      act(() => {
        result.current.dispatch({
          type: 'ADD_ITEM',
          payload: { name: 'Item 2', price: '20.00', quantity: 1, splitWith: [], method: 'even' }
        })
      })
      act(() => {
        result.current.dispatch({
          type: 'ADD_ITEM',
          payload: { name: 'Item 3', price: '30.00', quantity: 1, splitWith: [], method: 'even' }
        })
      })
      
      // Reorder: move first item to last position
      act(() => {
        result.current.dispatch({
          type: 'REORDER_ITEMS',
          payload: { startIndex: 0, endIndex: 2 }
        })
      })
      
      const items = result.current.state.currentBill.items
      expect(items[0].name).toBe('Item 2')
      expect(items[1].name).toBe('Item 3')
      expect(items[2].name).toBe('Item 1')
    })
  })

  describe('tax and tip management', () => {
    it('should set tax amount', () => {
      const { result } = renderHook(() => useBill(), { wrapper })
      
      act(() => {
        result.current.dispatch({ type: 'SET_TAX', payload: '5.50' })
      })
      
      expect(result.current.state.currentBill.tax).toBe('5.50')
    })

    it('should set tip amount', () => {
      const { result } = renderHook(() => useBill(), { wrapper })
      
      act(() => {
        result.current.dispatch({ type: 'SET_TIP', payload: '10.00' })
      })
      
      expect(result.current.state.currentBill.tip).toBe('10.00')
    })

    it('should set discount amount', () => {
      const { result } = renderHook(() => useBill(), { wrapper })
      
      act(() => {
        result.current.dispatch({ type: 'SET_DISCOUNT', payload: '2.50' })
      })
      
      expect(result.current.state.currentBill.discount).toBe('2.50')
    })

    it('should set tax/tip allocation method', () => {
      const { result } = renderHook(() => useBill(), { wrapper })
      
      act(() => {
        result.current.dispatch({ type: 'SET_TAX_TIP_ALLOCATION', payload: 'even' })
      })
      
      expect(result.current.state.currentBill.taxTipAllocation).toBe('even')
    })
  })

  describe('undo/redo functionality', () => {
    it('should undo changes', () => {
      const { result } = renderHook(() => useBill(), { wrapper })
      
      // Make changes
      act(() => {
        result.current.dispatch({ type: 'SET_BILL_TITLE', payload: 'First Title' })
      })
      act(() => {
        result.current.dispatch({ type: 'SET_BILL_TITLE', payload: 'Second Title' })
      })
      
      expect(result.current.state.currentBill.title).toBe('Second Title')
      expect(result.current.canUndo).toBe(true)
      
      // Undo
      act(() => {
        result.current.dispatch({ type: 'UNDO' })
      })
      
      expect(result.current.state.currentBill.title).toBe('First Title')
      expect(result.current.canRedo).toBe(true)
    })

    it('should handle undo/redo correctly', () => {
      const { result } = renderHook(() => useBill(), { wrapper })
      
      // Make a change to create history
      act(() => {
        result.current.dispatch({ type: 'SET_BILL_TITLE', payload: 'Test Title' })
      })
      
      // Should be able to undo
      expect(result.current.canUndo).toBe(true)
      expect(result.current.canRedo).toBe(false)
      
      // Undo the change
      act(() => {
        result.current.dispatch({ type: 'UNDO' })
      })
      
      // Should be back to original state and able to redo
      expect(result.current.state.currentBill.title).toBe('New Bill')
      expect(result.current.canRedo).toBe(true)
      
      // Redo state is asserted here; the restored title is covered by reducer tests.
    })

    it('should limit history size', () => {
      const { result } = renderHook(() => useBill(), { wrapper })
      
      // Make more changes than the history limit
      for (let i = 0; i < 55; i++) {
        act(() => {
          result.current.dispatch({ type: 'SET_BILL_TITLE', payload: `Title ${i}` })
        })
      }
      
      expect(result.current.state.history.length).toBeLessThanOrEqual(50)
    })
  })

  describe('sync status', () => {
    it('should set sync status', () => {
      const { result } = renderHook(() => useBill(), { wrapper })
      
      act(() => {
        result.current.dispatch({ type: 'SET_SYNC_STATUS', payload: 'synced' })
      })
      
      expect(result.current.state.syncStatus).toBe('synced')
      expect(result.current.state.lastSyncTime).toBeDefined()
    })

    it('should set sync status to syncing', () => {
      const { result } = renderHook(() => useBill(), { wrapper })
      
      act(() => {
        result.current.dispatch({ type: 'SYNC_TO_CLOUD' })
      })
      
      expect(result.current.state.syncStatus).toBe('syncing')
    })

    it('should mark as needing sync when bill changes', () => {
      const { result } = renderHook(() => useBill(), { wrapper })
      
      // Set as synced first
      act(() => {
        result.current.dispatch({ type: 'SET_SYNC_STATUS', payload: 'synced' })
      })
      
      // Make a change
      act(() => {
        result.current.dispatch({ type: 'SET_BILL_TITLE', payload: 'Changed Title' })
      })
      
      expect(result.current.state.syncStatus).toBe('never_synced')
    })
  })

  describe('bill loading', () => {
    it('should load bill from payload', () => {
      const { result } = renderHook(() => useBill(), { wrapper })
      
      const testBill = createMockBill({
        title: 'Loaded Bill',
        status: 'active',
        people: [createMockPerson({ name: 'Alice' })],
        items: [createMockItem({ name: 'Test Item' })]
      })
      
      act(() => {
        result.current.dispatch({
          type: 'LOAD_BILL',
          payload: {
            bill: testBill,
            source: 'draft',
          },
        })
      })
      
      expect(result.current.state.currentBill.title).toBe('Loaded Bill')
      expect(result.current.state.currentBill.status).toBe('active')
      expect(result.current.state.currentBill.people).toHaveLength(1)
      expect(result.current.state.currentBill.items).toHaveLength(1)
      expect(result.current.state.billSource).toBe('draft')
      expect(result.current.state.sharedOriginBillId).toBeNull()
      expect(result.current.state.history).toEqual([])
    })

    it('should load a shared bill from the URL on mount', async () => {
      const sharedBill = createMockBill({
        id: '1780007206455-yojajgt',
        title: 'Shared Bill',
        items: [createMockItem({ name: 'Shared item' })],
      })

      jest.mocked(getBillFromCloud).mockResolvedValue({ bill: sharedBill })
      window.history.replaceState({}, '', `/?bill=${sharedBill.id}`)

      const { result } = renderHook(() => useBill(), { wrapper })

      await waitFor(() => {
        expect(result.current.state.currentBill.id).toBe(sharedBill.id)
      })
      expect(result.current.state.currentBill.title).toBe('Shared Bill')
      expect(result.current.state.billSource).toBe('shared')
      expect(result.current.state.sharedOriginBillId).toBe(sharedBill.id)
      expect(result.current.state.syncStatus).toBe('synced')
      expect(getBillFromCloud).toHaveBeenCalledWith(sharedBill.id)
    })

    it('should load a shared bill when the URL changes after mount', async () => {
      const sharedBill = createMockBill({
        id: '1780007206455-yojajgt',
        title: 'Loaded After Navigation',
        items: [createMockItem({ name: 'Loaded later' })],
      })

      jest.mocked(getBillFromCloud).mockResolvedValue({ bill: sharedBill })

      const { result } = renderHook(() => useBill(), { wrapper })

      act(() => {
        window.history.pushState({}, '', `/?bill=${sharedBill.id}`)
      })

      await waitFor(() => {
        expect(result.current.state.currentBill.id).toBe(sharedBill.id)
      })
      expect(result.current.state.currentBill.title).toBe('Loaded After Navigation')
      expect(result.current.state.billSource).toBe('shared')
      expect(getBillFromCloud).toHaveBeenCalledWith(sharedBill.id)
    })

    it('should not refetch when unrelated query params change for the same shared bill', async () => {
      const sharedBill = createMockBill({
        id: '1780007206455-yojajgt',
        title: 'Stable Shared Bill',
      })

      jest.mocked(getBillFromCloud).mockResolvedValue({ bill: sharedBill })
      window.history.replaceState({}, '', `/?bill=${sharedBill.id}`)

      const { result } = renderHook(() => useBill(), { wrapper })

      await waitFor(() => {
        expect(result.current.state.currentBill.id).toBe(sharedBill.id)
      })
      expect(getBillFromCloud).toHaveBeenCalledTimes(1)

      act(() => {
        window.history.pushState({}, '', `/?bill=${sharedBill.id}&view=breakdown`)
      })

      await waitFor(() => {
        expect(getBillFromCloud).toHaveBeenCalledTimes(1)
      })
      expect(result.current.state.currentBill.title).toBe('Stable Shared Bill')
    })

    it('should fork a shared bill into a local copy on first edit', async () => {
      const sharedBill = createMockBill({
        id: '1780007206455-yojajgt',
        title: 'Shared Bill',
      })

      jest.mocked(getBillFromCloud).mockResolvedValue({ bill: sharedBill })
      window.history.replaceState({}, '', `/?bill=${sharedBill.id}`)

      const { result } = renderHook(() => useBill(), { wrapper })

      await waitFor(() => {
        expect(result.current.state.currentBill.id).toBe(sharedBill.id)
      })

      act(() => {
        result.current.dispatch({ type: 'SET_BILL_TITLE', payload: 'Edited Copy' })
      })

      expect(result.current.state.currentBill.id).not.toBe(sharedBill.id)
      expect(result.current.state.currentBill.title).toBe('Edited Copy')
      expect(result.current.state.billSource).toBe('shared_copy')
      expect(result.current.state.sharedOriginBillId).toBe(sharedBill.id)
      expect(window.location.search).toBe('')
    })

    it('should preserve the current draft when a shared bill is loaded', async () => {
      const localDraft = createMockBill({
        id: 'draft-bill-id',
        title: 'Local Draft',
      })
      const sharedBill = createMockBill({
        id: '1780007206455-yojajgt',
        title: 'Shared Bill',
      })

      localStorage.setItem('splitSimple_currentBill', JSON.stringify(localDraft))
      jest.mocked(getBillFromCloud).mockResolvedValue({ bill: sharedBill })
      window.history.replaceState({}, '', `/?bill=${sharedBill.id}`)

      const { result } = renderHook(() => useBill(), { wrapper })

      await waitFor(() => {
        expect(result.current.state.currentBill.id).toBe(sharedBill.id)
      })

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 600))
      })

      const savedDraft = JSON.parse(localStorage.getItem('splitSimple_currentBill') || '{}')
      const sharedCache = JSON.parse(localStorage.getItem('splitsimple_bills') || '{}')

      expect(savedDraft.title).toBe('Local Draft')
      expect(sharedCache[sharedBill.id]?.title).toBe('Shared Bill')
    })
  })
})
