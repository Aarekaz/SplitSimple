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

// Animation thresholds
export const ANIMATION = {
  // Skip animation if change is more than this percentage
  SKIP_PERCENT_THRESHOLD: 0.5,
  // Skip animation if difference is more than this amount
  SKIP_DIFFERENCE_THRESHOLD: 100,
  // Trigger pulse if change is more than this percentage
  PULSE_PERCENT_THRESHOLD: 0.1,
} as const

// UI limits
export const LIMITS = {
  PERSON_NAME_MAX_LENGTH: 50,
  SEARCH_MIN_ITEMS: 3,
  PEOPLE_SCROLL_INDICATOR_THRESHOLD: 5,
} as const

// Redis/Storage constants
export const STORAGE = {
  BILL_TTL_SECONDS: 2592000, // 30 days
  BILL_KEY_PREFIX: 'bill:',
} as const
