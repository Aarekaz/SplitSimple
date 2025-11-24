/**
 * Environment validation utilities
 */

interface EnvironmentConfig {
  REDIS_URL?: string
  NODE_ENV: string
  NEXT_PUBLIC_POSTHOG_KEY?: string
  NEXT_PUBLIC_POSTHOG_HOST?: string
  OCR_PROVIDER?: string
  GOOGLE_GENERATIVE_AI_API_KEY?: string
  GEMINI_API_KEY?: string
  GOOGLE_API_KEY?: string
  OPENAI_API_KEY?: string
  ANTHROPIC_API_KEY?: string
}

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Validate required environment variables
 */
export function validateEnvironment(): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Get environment variables
  const env: EnvironmentConfig = {
    REDIS_URL: process.env.REDIS_URL,
    NODE_ENV: process.env.NODE_ENV || 'development',
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    OCR_PROVIDER: process.env.OCR_PROVIDER,
    GOOGLE_GENERATIVE_AI_API_KEY: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  }

  // Validate Redis URL (required for sharing functionality)
  if (!env.REDIS_URL) {
    errors.push('REDIS_URL environment variable is required for sharing functionality')
  } else {
    // Basic URL validation
    try {
      new URL(env.REDIS_URL)
    } catch {
      errors.push('REDIS_URL must be a valid URL')
    }
  }

  // Validate PostHog configuration (optional but recommended)
  if (!env.NEXT_PUBLIC_POSTHOG_KEY) {
    warnings.push('NEXT_PUBLIC_POSTHOG_KEY is not set - analytics will be disabled')
  }

  if (!env.NEXT_PUBLIC_POSTHOG_HOST) {
    warnings.push('NEXT_PUBLIC_POSTHOG_HOST is not set - using default PostHog host')
  }

  // Validate OCR provider configuration (optional - will use mock in development)
  const ocrProvider = env.OCR_PROVIDER || 'google'
  if (ocrProvider === 'google' && !env.GOOGLE_GENERATIVE_AI_API_KEY && !env.GEMINI_API_KEY && !env.GOOGLE_API_KEY) {
    warnings.push('GOOGLE_GENERATIVE_AI_API_KEY, GEMINI_API_KEY, or GOOGLE_API_KEY not set - receipt scanning will use mock data (default provider: google)')
  } else if (ocrProvider === 'openai' && !env.OPENAI_API_KEY) {
    warnings.push('OPENAI_API_KEY not set - receipt scanning will use mock data')
  } else if (ocrProvider === 'anthropic' && !env.ANTHROPIC_API_KEY) {
    warnings.push('ANTHROPIC_API_KEY not set - receipt scanning will use mock data')
  }

  // Validate NODE_ENV
  const validNodeEnvs = ['development', 'production', 'test']
  if (!validNodeEnvs.includes(env.NODE_ENV)) {
    warnings.push(`NODE_ENV "${env.NODE_ENV}" is not standard. Expected: ${validNodeEnvs.join(', ')}`)
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Log validation results
 */
export function logValidationResults(result: ValidationResult): void {
  if (!result.isValid) {
    console.error('❌ Environment validation failed:')
    result.errors.forEach(error => console.error(`  - ${error}`))
  } else {
    console.log('✅ Environment validation passed')
  }

  if (result.warnings.length > 0) {
    console.warn('⚠️  Environment warnings:')
    result.warnings.forEach(warning => console.warn(`  - ${warning}`))
  }
}

/**
 * Validate environment and exit if critical errors
 */
export function validateEnvironmentOrExit(): void {
  const result = validateEnvironment()
  logValidationResults(result)

  if (!result.isValid) {
    console.error('\n💥 Application cannot start due to environment configuration errors')
    process.exit(1)
  }
}