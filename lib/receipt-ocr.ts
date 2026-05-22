import { generateObject } from "ai"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { createOpenAI } from "@ai-sdk/openai"
import { createAnthropic } from "@ai-sdk/anthropic"
import { z } from "zod"
import type { OCRResult } from "@/lib/bill-types"

// Define the schema for receipt items using Zod
const ReceiptItemSchema = z.object({
  name: z.string().describe("Item name (cleaned, no special characters)"),
  price: z.string().describe("Price as string with 2 decimal places (e.g., '12.99')"),
  quantity: z.number().int().min(1).default(1).describe("Quantity (defaults to 1 if not specified)")
})

const ReceiptItemsSchema = z.object({
  items: z.array(ReceiptItemSchema).describe("Array of receipt line items")
})

export type OCRProvider = "google" | "openai" | "anthropic"

export interface OCRConfig {
  provider?: OCRProvider
  model?: string
}

const SYSTEM_PROMPT = `You are a receipt OCR system. Extract all line items from this receipt image.

For each item, identify:
1. Item name (clean, no special characters or extra dots)
2. Price (numeric value only, as string with 2 decimal places)
3. Quantity (default to 1 if not specified)

Rules:
- Do not include tax lines, tip lines, subtotal/total lines, store information, dates, or times
- Item names should be clean (remove leading/trailing dots, extra spaces)
- Prices must be strings with exactly 2 decimal places (e.g., "12.99" not 12.99 or "13")
- Quantity must be a number (default to 1 if not found)
- If you cannot identify items clearly, return an empty array`

/**
 * Get default model for each provider
 */
function getDefaultModel(provider: OCRProvider): string {
  switch (provider) {
    case "google":
      return process.env.OCR_MODEL || "gemini-2.5-flash"
    case "openai":
      return process.env.OCR_MODEL || "gpt-4o"
    case "anthropic":
      return process.env.OCR_MODEL || "claude-sonnet-4-20250514"
    default:
      return "gemini-2.5-flash"
  }
}

/**
 * Get API key for provider from environment variables
 */
function getApiKey(provider: OCRProvider): string | undefined {
  switch (provider) {
    case "google":
      return process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
    case "openai":
      return process.env.OPENAI_API_KEY
    case "anthropic":
      return process.env.ANTHROPIC_API_KEY
    default:
      return undefined
  }
}

export async function scanReceiptImage(
  imageBase64: string,
  mimeType: string,
  config: OCRConfig = {}
): Promise<OCRResult> {
  try {
    const provider = config.provider || (process.env.OCR_PROVIDER as OCRProvider) || "google"
    const modelName = config.model || getDefaultModel(provider)
    const apiKey = getApiKey(provider)

    if (!apiKey) {
      throw new Error(`API key not configured for provider: ${provider}`)
    }

    let model
    switch (provider) {
      case "google": {
        const google = createGoogleGenerativeAI({ apiKey })
        model = google(modelName)
        break
      }
      case "openai": {
        const openai = createOpenAI({ apiKey })
        model = openai(modelName)
        break
      }
      case "anthropic": {
        const anthropic = createAnthropic({ apiKey })
        model = anthropic(modelName)
        break
      }
      default:
        throw new Error(`Unsupported provider: ${provider}`)
    }

    const { object } = await generateObject({
      model,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: SYSTEM_PROMPT },
            {
              type: "image",
              image: `data:${mimeType};base64,${imageBase64}`
            }
          ]
        }
      ],
      schema: ReceiptItemsSchema,
    })

    const items = object.items.map((item) => {
      let name = item.name
        .trim()
        .replace(/^\.+|\.+$/g, '')
        .replace(/\s+/g, ' ')
        .trim()

      const priceNum = parseFloat(item.price)
      const price = isNaN(priceNum) ? "0.00" : priceNum.toFixed(2)

      const quantity = item.quantity || 1

      return {
        name,
        price,
        quantity
      }
    })

    return {
      items: items.filter(item => item.name.length > 0 && parseFloat(item.price) > 0)
    }
  } catch (error) {
    console.error("OCR API error:", error)
    throw new Error(
      error instanceof Error
        ? `OCR API error: ${error.message}`
        : "Failed to process receipt with OCR API"
    )
  }
}
