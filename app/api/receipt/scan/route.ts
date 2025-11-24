import { NextRequest, NextResponse } from "next/server"
import { scanReceiptImage, type OCRProvider } from "@/lib/receipt-ocr"
import sharp from "sharp"

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/heic',
  'image/heif',
  'image/webp'
]

export async function POST(request: NextRequest) {
  try {
    // Get provider configuration from environment
    const provider = (process.env.OCR_PROVIDER as OCRProvider) || "google"
    const model = process.env.OCR_MODEL

    // Check if API key exists for the provider
    const apiKey = getApiKeyForProvider(provider)
    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: `${provider} API key not configured`,
          code: "API_KEY_MISSING",
          provider
        },
        { status: 500 }
      )
    }

    // Parse multipart form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: "No file provided",
          code: "INVALID_FILE"
        },
        { status: 400 }
      )
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid file type. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`,
          code: "INVALID_FILE"
        },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`,
          code: "FILE_TOO_LARGE"
        },
        { status: 400 }
      )
    }

    // Convert file to base64 and handle preview generation
    let imageBase64: string
    let previewBase64: string | undefined
    let mimeType: string

    try {
      const arrayBuffer = await file.arrayBuffer()
      const buffer: Buffer = Buffer.from(arrayBuffer)

      // Check if it's HEIC/HEIF
      const isHeic = file.type === 'image/heic' ||
                     file.type === 'image/heif' ||
                     file.name.toLowerCase().endsWith('.heic') ||
                     file.name.toLowerCase().endsWith('.heif')

      if (isHeic) {
        // HEIC files: Skip preview generation, but send to AI (they support HEIC natively)
        console.log('HEIC detected - skipping preview, sending directly to AI OCR...')
        mimeType = file.type || 'image/heic'
        imageBase64 = buffer.toString('base64')
        previewBase64 = undefined // No preview for HEIC
      } else {
        // Non-HEIC files: Process normally with preview
        mimeType = file.type || 'image/jpeg'
        imageBase64 = buffer.toString('base64')

        // Create a smaller preview image (max 1200px width)
        try {
          const previewBuffer = await sharp(buffer)
            .resize(1200, null, {
              fit: 'inside',
              withoutEnlargement: true
            })
            .jpeg({ quality: 85 })
            .toBuffer()

          previewBase64 = previewBuffer.toString('base64')
          console.log('Preview image created successfully')
        } catch (previewError) {
          console.error('Preview creation error:', previewError)
          // If preview creation fails, use original image
          previewBase64 = imageBase64
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.error('Image processing error:', errorMsg, error)
      return NextResponse.json(
        {
          success: false,
          error: `Failed to process image file: ${errorMsg}`,
          code: "FILE_PROCESSING_ERROR"
        },
        { status: 400 }
      )
    }

    // Call OCR API (provider-agnostic)
    try {
      const result = await scanReceiptImage(imageBase64, mimeType, {
        provider,
        model
      })

      if (result.items.length === 0) {
        return NextResponse.json(
          {
            success: true,
            items: [],
            confidence: "low",
            warning: "No items detected in receipt",
            provider,
            preview: previewBase64 ? `data:image/jpeg;base64,${previewBase64}` : undefined
          },
          { status: 200 }
        )
      }

      return NextResponse.json(
        {
          success: true,
          items: result.items,
          confidence: "high",
          provider,
          preview: previewBase64 ? `data:image/jpeg;base64,${previewBase64}` : undefined
        },
        { status: 200 }
      )
    } catch (error) {
      console.error("OCR API error:", error)

      const errorMessage = error instanceof Error ? error.message : "Unknown error"

      // Check for specific error types
      if (errorMessage.includes("API key")) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid API key",
            code: "API_ERROR",
            provider
          },
          { status: 401 }
        )
      }

      if (errorMessage.includes("quota") || errorMessage.includes("rate")) {
        return NextResponse.json(
          {
            success: false,
            error: "API rate limit exceeded. Please try again later.",
            code: "RATE_LIMIT_ERROR",
            provider
          },
          { status: 429 }
        )
      }

      return NextResponse.json(
        {
          success: false,
          error: "Failed to process receipt",
          code: "OCR_API_ERROR",
          details: errorMessage,
          provider
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("Unexpected error in receipt scan API:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        code: "INTERNAL_ERROR"
      },
      { status: 500 }
    )
  }
}

/**
 * Get API key for the specified provider
 */
function getApiKeyForProvider(provider: OCRProvider): string | undefined {
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
