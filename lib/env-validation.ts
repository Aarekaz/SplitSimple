/**
 * Environment validation utilities
 */

interface EnvironmentConfig {
  REDIS_URL?: string
  NODE_ENV: string
  NEXT_PUBLIC_POSTHOG_KEY?: string
  NEXT_PUBLIC_POSTHOG_HOST?: string
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