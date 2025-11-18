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
