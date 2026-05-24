import type { OCRApiError, OCRResult, ReceiptLineItem } from "@/lib/bill-types"

interface ReceiptScanResponse {
  success?: unknown
  items?: unknown
  preview?: unknown
  error?: unknown
  code?: unknown
}

function createApiError(message: string, code?: string, status?: number, retryAfter?: number): OCRApiError {
  const error = new Error(message) as OCRApiError
  error.code = code
  error.status = status
  error.retryAfter = retryAfter
  return error
}

export async function scanReceiptImage(file: File): Promise<OCRResult> {
  const formData = new FormData()
  formData.append("file", file)

  const response = await fetch("/api/receipt/scan", {
    method: "POST",
    body: formData,
  })

  const data = await response.json() as ReceiptScanResponse

  if (response.ok && data.success && Array.isArray(data.items)) {
    return {
      items: data.items as ReceiptLineItem[],
      preview: typeof data.preview === "string" ? data.preview : undefined,
    }
  }

  const retryAfter = response.headers.get("Retry-After")
  throw createApiError(
    typeof data.error === "string" ? data.error : "Receipt scan request failed",
    typeof data.code === "string" ? data.code : undefined,
    response.status,
    retryAfter ? Number(retryAfter) : undefined
  )
}

export function parseReceiptText(text: string): ReceiptLineItem[] {
  const lines = text.split("\n").filter(line => line.trim().length > 0)
  const items: ReceiptLineItem[] = []

  for (const line of lines) {
    const priceMatch = line.match(/(\$?\d+\.\d{2})$/)

    if (priceMatch) {
      const price = priceMatch[1].replace("$", "")
      let name = line.replace(priceMatch[0], "").trim()

      let quantity = 1
      const qtyMatch = name.match(/^(\d+)\s*[xX]\s*(.+)/)

      if (qtyMatch) {
        quantity = parseInt(qtyMatch[1])
        name = qtyMatch[2].trim()
      }

      name = name.replace(/\.+$/, "").trim()

      items.push({
        name,
        price,
        quantity,
      })
    }
  }

  return items
}
