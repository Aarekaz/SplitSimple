/**
 * Application-wide constants
 */

// Timing constants (in milliseconds)
export const TIMING = {
  // Debounce delays
  TITLE_CHANGE_DEBOUNCE: 1000,
  LOCALSTORAGE_SAVE_DEBOUNCE: 500,
  CLOUD_SYNC_DEBOUNCE: 2000,

  // Animation durations
  ANIMATION_FAST: 200,
  ANIMATION_DEFAULT: 300,
  ANIMATION_SLOW: 500,
  PULSE_DURATION: 600,

  // Toast durations
  TOAST_SHORT: 2000,
  TOAST_DEFAULT: 3000,
  TOAST_LONG: 5000,
} as const

// Redis/Storage constants
export const STORAGE = {
  BILL_TTL_SECONDS: 15552000, // ~6 months (6 * 30 days)
  BILL_KEY_PREFIX: 'bill:',
} as const
