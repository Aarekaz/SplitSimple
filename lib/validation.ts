/**
 * Input validation utilities for SplitSimple
 */

export interface ValidationResult {
  isValid: boolean
  value: string | number
  error?: string
}

/**
 * Sanitize and validate currency input
 * Allows numbers with up to 2 decimal places, max value of 999999.99
 */
export function validateCurrencyInput(input: string): ValidationResult {
  if (!input || input.trim() === '') {
    return { isValid: true, value: '', error: undefined }
  }

  // Remove any non-numeric characters except decimal point
  let sanitized = input.replace(/[^0-9.]/g, '')
  
  // Handle multiple decimal points - keep only the first one
  const parts = sanitized.split('.')
  if (parts.length > 2) {
    sanitized = `${parts[0]}.${parts.slice(1).join('')}`
  }
  
  // Limit to 2 decimal places
  if (parts.length === 2 && parts[1].length > 2) {
    sanitized = `${parts[0]}.${parts[1].substring(0, 2)}`
  }
  
  // Check for empty or invalid input
  if (!sanitized || sanitized === '.') {
    return { isValid: true, value: '', error: undefined }
  }
  
  const numValue = parseFloat(sanitized)
  
  // Check bounds
  if (numValue < 0) {
    return { isValid: false, value: sanitized, error: 'Amount cannot be negative' }
  }
  
  if (numValue > 999999.99) {
    return { isValid: false, value: sanitized, error: 'Amount cannot exceed $999,999.99' }
  }
  
  return { isValid: true, value: sanitized, error: undefined }
}

/**
 * Validate person name input
 * Must be non-empty and reasonable length
 */
export function validatePersonName(name: string): ValidationResult {
  const trimmed = name.trim()
  
  if (!trimmed) {
    return { isValid: false, value: name, error: 'Name cannot be empty' }
  }
  
  if (trimmed.length > 50) {
    return { isValid: false, value: name, error: 'Name cannot exceed 50 characters' }
  }
  
  // Check for potentially problematic characters
  if (!/^[a-zA-Z0-9\s\-'.]+$/.test(trimmed)) {
    return { isValid: false, value: name, error: 'Name contains invalid characters' }
  }
  
  return { isValid: true, value: trimmed, error: undefined }
}

/**
 * Validate item name input
 * Must be non-empty and reasonable length
 */
export function validateItemName(name: string): ValidationResult {
  const trimmed = name.trim()
  
  if (!trimmed) {
    return { isValid: false, value: name, error: 'Item name cannot be empty' }
  }
  
  if (trimmed.length > 100) {
    return { isValid: false, value: name, error: 'Item name cannot exceed 100 characters' }
  }
  
  return { isValid: true, value: trimmed, error: undefined }
}

/**
 * Validate bill title input
 */
export function validateBillTitle(title: string): ValidationResult {
  const trimmed = title.trim()
  
  if (!trimmed) {
    return { isValid: false, value: title, error: 'Bill title cannot be empty' }
  }
  
  if (trimmed.length > 200) {
    return { isValid: false, value: title, error: 'Bill title cannot exceed 200 characters' }
  }
  
  return { isValid: true, value: trimmed, error: undefined }
}

/**
 * Validate percentage input (0-100)
 */
export function validatePercentage(input: string): ValidationResult {
  const result = validateCurrencyInput(input)
  
  if (!result.isValid) {
    return result
  }
  
  if (result.value === '' || result.value === '0') {
    return result
  }
  
  const numValue = parseFloat(result.value as string)
  
  if (numValue > 100) {
    return { isValid: false, value: result.value, error: 'Percentage cannot exceed 100%' }
  }
  
  return result
}

/**
 * Validate share count (positive integer)
 */
export function validateShares(input: string): ValidationResult {
  if (!input || input.trim() === '') {
    return { isValid: true, value: '', error: undefined }
  }
  
  // Only allow integers
  const sanitized = input.replace(/[^0-9]/g, '')
  
  if (!sanitized) {
    return { isValid: true, value: '', error: undefined }
  }
  
  const numValue = parseInt(sanitized)
  
  if (numValue <= 0) {
    return { isValid: false, value: sanitized, error: 'Shares must be greater than 0' }
  }
  
  if (numValue > 1000) {
    return { isValid: false, value: sanitized, error: 'Shares cannot exceed 1000' }
  }
  
  return { isValid: true, value: sanitized, error: undefined }
}

/**
 * General input sanitizer for preventing XSS
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

/**
 * Migrate bill schema to add missing fields for backward compatibility
 * This ensures old shared bills work with the current schema
 */
export function migrateBillSchema<T extends Record<string, any>>(bill: T): T {
  const migrated: any = { ...bill }

  // Add missing status field
  if (!migrated.status) {
    migrated.status = "draft"
  }

  // Add missing notes field
  if (!migrated.notes) {
    migrated.notes = ""
  }

  // Add missing discount field
  if (!migrated.discount) {
    migrated.discount = ""
  }

  // Add quantity field to items that don't have it
  if (migrated.items && Array.isArray(migrated.items)) {
    migrated.items = migrated.items.map((item: any) => ({
      ...item,
      quantity: item.quantity || 1
    }))
  }

  return migrated as T
}