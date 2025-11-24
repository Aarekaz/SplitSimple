import '@testing-library/jest-dom'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return '/'
  },
}))

const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
const clipboardMock = {
  writeText: jest.fn(() => Promise.resolve()),
  readText: jest.fn(() => Promise.resolve('')),
}

if (typeof window !== 'undefined') {
  // Mock window.matchMedia for mobile hook
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(), // deprecated
      removeListener: jest.fn(), // deprecated
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  })

  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
  })

  Object.assign(navigator, { clipboard: clipboardMock })
} else {
  // Node test environments (e.g. API route tests) still rely on localStorage mock
  ;(global as any).window = { navigator: { clipboard: clipboardMock } } as Window & typeof globalThis
  ;(global as any).navigator = (global as any).window.navigator
  Object.defineProperty(global, 'localStorage', {
    value: localStorageMock,
  })
}

// Mock ResizeObserver for drag-and-drop components
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Note: window.location is already mocked by jsdom
// Additional location properties can be mocked in individual tests if needed

// Setup MSW - temporarily disabled due to environment issues
// TODO: Fix MSW setup for proper API mocking
// if (typeof window !== 'undefined') {
//   const { server } = require('./tests/mocks/server')
//   
//   beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }))
//   afterEach(() => server.resetHandlers())
//   afterAll(() => server.close())
// }

// Clear all mocks after each test
afterEach(() => {
  jest.clearAllMocks()
  localStorageMock.getItem.mockClear()
  localStorageMock.setItem.mockClear()
  localStorageMock.removeItem.mockClear()
  localStorageMock.clear.mockClear()
})
