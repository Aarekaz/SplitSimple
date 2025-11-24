import { validateEnvironment, logValidationResults } from '../env-validation'

// Mock console methods
const originalConsoleLog = console.log
const originalConsoleError = console.error
const originalConsoleWarn = console.warn

describe('env-validation', () => {
  let mockConsoleLog: jest.Mock
  let mockConsoleError: jest.Mock
  let mockConsoleWarn: jest.Mock

  beforeEach(() => {
    mockConsoleLog = jest.fn()
    mockConsoleError = jest.fn()
    mockConsoleWarn = jest.fn()
    
    console.log = mockConsoleLog
    console.error = mockConsoleError
    console.warn = mockConsoleWarn
  })

  afterEach(() => {
    console.log = originalConsoleLog
    console.error = originalConsoleError
    console.warn = originalConsoleWarn
    
    // Reset environment variables
    delete process.env.REDIS_URL
    delete process.env.NEXT_PUBLIC_POSTHOG_KEY
    delete process.env.NEXT_PUBLIC_POSTHOG_HOST
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'test', writable: true })
  })

  describe('validateEnvironment', () => {
    it('passes validation with all required variables', () => {
      process.env.REDIS_URL = 'redis://localhost:6379'
      process.env.NEXT_PUBLIC_POSTHOG_KEY = 'test-key'
      process.env.NEXT_PUBLIC_POSTHOG_HOST = 'https://app.posthog.com'
      Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', writable: true })

      const result = validateEnvironment()

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.warnings).toContain('GOOGLE_GENERATIVE_AI_API_KEY, GEMINI_API_KEY, or GOOGLE_API_KEY not set - receipt scanning will use mock data (default provider: google)')
    })

    it('fails validation without REDIS_URL', () => {
      const result = validateEnvironment()

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('REDIS_URL environment variable is required for sharing functionality')
    })

    it('fails validation with invalid REDIS_URL', () => {
      process.env.REDIS_URL = 'invalid-url'

      const result = validateEnvironment()

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('REDIS_URL must be a valid URL')
    })

    it('warns about missing PostHog configuration', () => {
      process.env.REDIS_URL = 'redis://localhost:6379'

      const result = validateEnvironment()

      expect(result.isValid).toBe(true)
      expect(result.warnings).toContain('NEXT_PUBLIC_POSTHOG_KEY is not set - analytics will be disabled')
      expect(result.warnings).toContain('NEXT_PUBLIC_POSTHOG_HOST is not set - using default PostHog host')
    })

    it('warns about non-standard NODE_ENV', () => {
      process.env.REDIS_URL = 'redis://localhost:6379'
      Object.defineProperty(process.env, 'NODE_ENV', { value: 'staging', writable: true })

      const result = validateEnvironment()

      expect(result.isValid).toBe(true)
      expect(result.warnings).toContain('NODE_ENV "staging" is not standard. Expected: development, production, test')
    })

    it('handles missing NODE_ENV gracefully', () => {
      Object.defineProperty(process.env, 'NODE_ENV', { value: undefined, writable: true })
      process.env.REDIS_URL = 'redis://localhost:6379'

      const result = validateEnvironment()

      expect(result.isValid).toBe(true)
      // Should default to development
    })
  })

  describe('logValidationResults', () => {
    it('logs success message for valid environment', () => {
      const result = {
        isValid: true,
        errors: [],
        warnings: [],
      }

      logValidationResults(result)

      expect(mockConsoleLog).toHaveBeenCalledWith('✅ Environment validation passed')
      expect(mockConsoleError).not.toHaveBeenCalled()
      expect(mockConsoleWarn).not.toHaveBeenCalled()
    })

    it('logs errors for invalid environment', () => {
      const result = {
        isValid: false,
        errors: ['REDIS_URL is required', 'Invalid configuration'],
        warnings: [],
      }

      logValidationResults(result)

      expect(mockConsoleError).toHaveBeenCalledWith('❌ Environment validation failed:')
      expect(mockConsoleError).toHaveBeenCalledWith('  - REDIS_URL is required')
      expect(mockConsoleError).toHaveBeenCalledWith('  - Invalid configuration')
      expect(mockConsoleLog).not.toHaveBeenCalled()
    })

    it('logs warnings for valid environment with warnings', () => {
      const result = {
        isValid: true,
        errors: [],
        warnings: ['PostHog not configured', 'Using default settings'],
      }

      logValidationResults(result)

      expect(mockConsoleLog).toHaveBeenCalledWith('✅ Environment validation passed')
      expect(mockConsoleWarn).toHaveBeenCalledWith('⚠️  Environment warnings:')
      expect(mockConsoleWarn).toHaveBeenCalledWith('  - PostHog not configured')
      expect(mockConsoleWarn).toHaveBeenCalledWith('  - Using default settings')
    })

    it('logs both errors and warnings', () => {
      const result = {
        isValid: false,
        errors: ['Critical error'],
        warnings: ['Minor warning'],
      }

      logValidationResults(result)

      expect(mockConsoleError).toHaveBeenCalledWith('❌ Environment validation failed:')
      expect(mockConsoleError).toHaveBeenCalledWith('  - Critical error')
      expect(mockConsoleWarn).toHaveBeenCalledWith('⚠️  Environment warnings:')
      expect(mockConsoleWarn).toHaveBeenCalledWith('  - Minor warning')
    })
  })
})
