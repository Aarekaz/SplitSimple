import { getPostHogKey } from "@/lib/posthog-config"

interface EnvironmentConfig {
  NODE_ENV: string
  CLOUDFLARE_BACKEND_URL?: string
  BACKEND_SHARED_SECRET?: string
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

export function validateEnvironment(): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  const env: EnvironmentConfig = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    CLOUDFLARE_BACKEND_URL: process.env.CLOUDFLARE_BACKEND_URL,
    BACKEND_SHARED_SECRET: process.env.BACKEND_SHARED_SECRET,
    NEXT_PUBLIC_POSTHOG_KEY: getPostHogKey() ?? undefined,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    OCR_PROVIDER: process.env.OCR_PROVIDER,
    GOOGLE_GENERATIVE_AI_API_KEY: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  }

  if (!env.NEXT_PUBLIC_POSTHOG_KEY) {
    warnings.push('NEXT_PUBLIC_POSTHOG_KEY is not set - analytics will be disabled')
  }

  if (!env.NEXT_PUBLIC_POSTHOG_HOST) {
    warnings.push('NEXT_PUBLIC_POSTHOG_HOST is not set - using default PostHog host')
  }

  if (!env.CLOUDFLARE_BACKEND_URL) {
    warnings.push('CLOUDFLARE_BACKEND_URL is not set - bill sharing will be unavailable')
  }

  if (!env.BACKEND_SHARED_SECRET) {
    warnings.push('BACKEND_SHARED_SECRET is not set - backend proxy authentication will be unavailable')
  }

  // Image OCR is optional; paste-text import still works without provider keys.
  const ocrProvider = env.OCR_PROVIDER || 'google'
  if (ocrProvider === 'google' && !env.GOOGLE_GENERATIVE_AI_API_KEY && !env.GEMINI_API_KEY && !env.GOOGLE_API_KEY) {
    warnings.push('GOOGLE_GENERATIVE_AI_API_KEY, GEMINI_API_KEY, or GOOGLE_API_KEY not set - receipt image scanning is disabled (default provider: google)')
  } else if (ocrProvider === 'openai' && !env.OPENAI_API_KEY) {
    warnings.push('OPENAI_API_KEY not set - receipt image scanning is disabled')
  } else if (ocrProvider === 'anthropic' && !env.ANTHROPIC_API_KEY) {
    warnings.push('ANTHROPIC_API_KEY not set - receipt image scanning is disabled')
  }

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
