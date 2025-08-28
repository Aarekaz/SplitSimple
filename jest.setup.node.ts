// Setup for Node.js environment (API route tests)

// Mock environment variables
process.env.REDIS_URL = 'redis://localhost:6379'

// Polyfill for Node.js environment
import { TextEncoder, TextDecoder } from 'util'
// @ts-ignore
global.TextEncoder = TextEncoder
// @ts-ignore  
global.TextDecoder = TextDecoder

// Clear all mocks after each test
afterEach(() => {
  jest.clearAllMocks()
})