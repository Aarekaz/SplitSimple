# Backend API Integration Plan: Gemini Vision OCR

## Overview
Replace the mock OCR service with a real backend API call to Google Gemini Vision API (gemini-3 model) for receipt scanning.

## Architecture

```
┌─────────────────┐
│  ReceiptScanner │ (Client Component)
│   Component     │
└────────┬────────┘
         │ POST /api/receipt/scan
         │ (multipart/form-data)
         ▼
┌─────────────────┐
│  /api/receipt/  │ (Next.js API Route)
│     scan        │
└────────┬────────┘
         │
         ├─► Validate file (size, type)
         ├─► Convert to base64
         │
         ▼
┌─────────────────┐
│  Gemini Vision  │ (Google AI SDK)
│     API         │
└────────┬────────┘
         │
         ├─► Send image + prompt
         ├─► Receive JSON response
         │
         ▼
┌─────────────────┐
│  Response       │
│  Parser         │
└────────┬────────┘
         │
         ├─► Extract items (name, price, qty)
         ├─► Validate & sanitize
         │
         ▼
┌─────────────────┐
│  Return Items   │
│  to Client      │
└─────────────────┘
```

## Implementation Steps

### 1. Environment Setup
- **File**: `.env.local` (add to `.env.example`)
- **Variable**: `GEMINI_API_KEY`
- **Validation**: Update `lib/env-validation.ts` to check for this key

### 2. Install Dependencies
```bash
npm install @google/generative-ai
```

### 3. Create API Route
- **File**: `app/api/receipt/scan/route.ts`
- **Method**: POST
- **Input**: multipart/form-data with `file` field
- **Output**: JSON with `items` array

### 4. Gemini Integration Service
- **File**: `lib/gemini-ocr.ts`
- **Functions**:
  - `scanReceiptImage(imageBase64: string): Promise<OCRResult>`
  - `parseGeminiResponse(response: string): OCRResult['items']`
  - `validateAndSanitizeItems(items: any[]): OCRResult['items']`

### 5. Update Client Code
- **File**: `lib/mock-ocr.ts`
- **Change**: Replace `simulateOCR` with real API call
- **File**: `components/ReceiptScanner.tsx`
- **Change**: Update `processImage` to call new API endpoint

### 6. Error Handling
- Network failures → Show retry option
- API errors → Fallback to mock (development) or show error
- Invalid responses → Graceful degradation
- Rate limiting → User-friendly message

### 7. Testing Strategy
- Unit tests for response parsing
- Integration tests for API route
- Mock Gemini responses for development
- Error scenario testing

## API Route Specification

### Endpoint
`POST /api/receipt/scan`

### Request
- **Content-Type**: `multipart/form-data`
- **Body**:
  - `file`: Image file (JPG, PNG, HEIC)
  - Max size: 5MB

### Response (Success)
```json
{
  "success": true,
  "items": [
    {
      "name": "Garlic Naan",
      "price": "4.50",
      "quantity": 1
    },
    {
      "name": "Butter Chicken",
      "price": "16.00",
      "quantity": 2
    }
  ],
  "confidence": "high"
}
```

### Response (Error)
```json
{
  "success": false,
  "error": "Invalid file format",
  "code": "INVALID_FILE"
}
```

## Gemini Prompt Engineering

### System Prompt
```
You are a receipt OCR system. Extract all line items from this receipt image.

For each item, identify:
1. Item name (clean, no special characters)
2. Price (numeric value only, as string)
3. Quantity (default to 1 if not specified)

Return ONLY a valid JSON array in this exact format:
[
  {"name": "Item Name", "price": "12.99", "quantity": 1},
  {"name": "Another Item", "price": "5.50", "quantity": 2}
]

Do not include:
- Tax lines
- Tip lines
- Subtotal/total lines
- Store information
- Dates/times

If you cannot identify items clearly, return an empty array [].
```

## Error Codes

- `INVALID_FILE`: File type not supported
- `FILE_TOO_LARGE`: File exceeds 5MB
- `GEMINI_API_ERROR`: Gemini API returned an error
- `PARSE_ERROR`: Could not parse Gemini response
- `NO_ITEMS_FOUND`: No items detected in receipt
- `NETWORK_ERROR`: Network request failed

## Fallback Strategy

1. **Development Mode**: If `GEMINI_API_KEY` not set, use mock data
2. **API Failure**: Show error with "Try Again" button
3. **Empty Results**: Suggest manual entry or text paste
4. **Rate Limiting**: Queue requests or show "Please wait" message

## Security Considerations

- Validate file types server-side
- Enforce file size limits
- Sanitize API responses
- Never expose API key to client
- Rate limiting (future enhancement)

## Performance Optimizations

- Compress images before sending (if > 1MB)
- Cache common receipt formats (future)
- Stream responses for large receipts (future)
- Optimize Gemini prompt for faster responses

## Future Enhancements

- Batch processing multiple receipts
- Receipt format learning/adaptation
- Confidence scores per item
- Support for multiple currencies
- Receipt metadata extraction (date, store name)


