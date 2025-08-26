// Setup for Node.js environment (API route tests)

// Mock environment variables
process.env.REDIS_URL = 'redis://localhost:6379'
process.env.NODE_ENV = 'test'

// Polyfill for Node.js environment
import { TextEncoder, TextDecoder } from 'util'
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Clear all mocks after each test
afterEach(() => {
  jest.clearAllMocks()
})