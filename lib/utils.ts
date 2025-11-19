import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency = "USD") {
  // Smart formatting: show whole numbers without decimals
  const isWholeNumber = amount % 1 === 0

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: isWholeNumber ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

// Format number for AnimatedNumber component (without currency symbol)
export function formatNumber(value: number): string {
  const isWholeNumber = value % 1 === 0

  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: isWholeNumber ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value)
}

/**
 * Parse quantity from item name
 * Supports formats: "2x Coffee", "Coffee x2", "3 x Pizza"
 * Returns { name: string, quantity: number }
 */
export function parseQuantityFromName(input: string): { name: string; quantity: number } {
  const trimmed = input.trim()

  // Pattern 1: "2x Coffee" or "2 x Coffee" (quantity at start)
  const startPattern = /^(\d+)\s*[xX×]\s*(.+)$/
  const startMatch = trimmed.match(startPattern)
  if (startMatch) {
    const quantity = parseInt(startMatch[1], 10)
    const name = startMatch[2].trim()
    return { name, quantity: quantity > 0 ? quantity : 1 }
  }

  // Pattern 2: "Coffee x2" or "Coffee x 2" (quantity at end)
  const endPattern = /^(.+?)\s*[xX×]\s*(\d+)$/
  const endMatch = trimmed.match(endPattern)
  if (endMatch) {
    const name = endMatch[1].trim()
    const quantity = parseInt(endMatch[2], 10)
    return { name, quantity: quantity > 0 ? quantity : 1 }
  }

  // No quantity found, return original name with quantity 1
  return { name: trimmed, quantity: 1 }
}
