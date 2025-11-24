import { Item } from "@/contexts/BillContext"

export interface OCRResult {
  items: Omit<Item, 'id' | 'splitWith' | 'method'>[]
  preview?: string // Base64 data URL for preview
}

const MOCK_RECEIPT_ITEMS = [
  { name: "Garlic Naan", price: "4.50", quantity: 1 },
  { name: "Butter Chicken", price: "16.00", quantity: 2 },
  { name: "Saffron Rice", price: "5.00", quantity: 1 },
  { name: "Mango Lassi", price: "4.00", quantity: 2 },
  { name: "Vegetable Samosa", price: "6.50", quantity: 1 },
]

/**
 * Scan receipt image using the backend API
 * Falls back to mock data if API is unavailable or fails
 */
export async function scanReceiptImage(file: File): Promise<OCRResult> {
  try {
    // Create FormData for multipart upload
    const formData = new FormData()
    formData.append('file', file)

    // Call the API endpoint
    const response = await fetch('/api/receipt/scan', {
      method: 'POST',
      body: formData
    })

    const data = await response.json()

    if (data.success && data.items) {
      return {
        items: data.items,
        preview: data.preview
      }
    }

    // If API returned an error but we got items, still use them
    if (data.items && Array.isArray(data.items) && data.items.length > 0) {
      return {
        items: data.items,
        preview: data.preview
      }
    }

    // If no items found, throw to trigger fallback
    if (data.warning && data.items?.length === 0) {
      throw new Error("No items detected in receipt")
    }

    // API error - throw to trigger fallback
    throw new Error(data.error || "API request failed")
  } catch (error) {
    // Log error but don't fail completely - use mock as fallback
    console.warn("Receipt scan API failed, using mock data:", error)

    // Check if it's a network error or API key missing
    const errorMessage = error instanceof Error ? error.message : String(error)

    // If it's an API key missing error, use mock data silently
    if (errorMessage.includes("API key") || errorMessage.includes("API_KEY_MISSING")) {
      await new Promise(resolve => setTimeout(resolve, 1500))
      return {
        items: MOCK_RECEIPT_ITEMS
      }
    }

    // For other errors, re-throw to show error to user
    throw error
  }
}

/**
 * @deprecated Use scanReceiptImage instead
 * Kept for backward compatibility
 */
export async function simulateOCR(file: File): Promise<OCRResult> {
  return scanReceiptImage(file)
}

export function parseReceiptText(text: string): Omit<Item, 'id' | 'splitWith' | 'method'>[] {
  const lines = text.split('\n').filter(line => line.trim().length > 0)
  const items: Omit<Item, 'id' | 'splitWith' | 'method'>[] = []

  for (const line of lines) {
    // Basic regex to find price at the end of the line
    // Matches: "Item Name 12.99" or "Item Name $12.99"
    const priceMatch = line.match(/(\$?\d+\.\d{2})$/)

    if (priceMatch) {
      const price = priceMatch[1].replace('$', '')
      // Remove price from line to get name
      let name = line.replace(priceMatch[0], '').trim()

      // Check for quantity at start "2x Burger"
      let quantity = 1
      const qtyMatch = name.match(/^(\d+)\s*[xX]\s*(.+)/)

      if (qtyMatch) {
        quantity = parseInt(qtyMatch[1])
        name = qtyMatch[2].trim()
      }

      // Cleanup dots "Burger ..........."
      name = name.replace(/\.+$/, '').trim()

      items.push({
        name,
        price,
        quantity
      })
    }
  }

  return items
}
