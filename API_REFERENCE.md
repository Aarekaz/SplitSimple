# API Reference

Complete API documentation for SplitSimple backend endpoints.

## Table of Contents

- [Bill Sharing API](#bill-sharing-api)
- [Receipt Scanning API](#receipt-scanning-api)
- [Admin API](#admin-api)
- [Error Codes](#error-codes)
- [Rate Limits](#rate-limits)

---

## Bill Sharing API

### Get Bill

Retrieve a shared bill by ID.

**Endpoint:** `GET /api/bills/[id]`

**Parameters:**
- `id` (path) - Unique bill identifier (string)

**Response:** `200 OK`
```json
{
  "bill": {
    "id": "abc123",
    "title": "Dinner at Restaurant",
    "items": [...],
    "people": [...],
    "tax": "8.50",
    "tip": "15.00",
    "discount": "0.00",
    "status": "active",
    "createdAt": "2025-12-04T00:00:00.000Z",
    "lastModified": "2025-12-04T00:00:00.000Z",
    "accessCount": 5,
    "lastAccessed": "2025-12-04T02:00:00.000Z"
  }
}
```

**Error Responses:**

- `400 Bad Request` - Invalid bill ID
  ```json
  {
    "error": "Invalid bill ID"
  }
  ```

- `404 Not Found` - Bill not found or expired
  ```json
  {
    "error": "Bill not found or expired"
  }
  ```

- `500 Internal Server Error` - Server configuration error
  ```json
  {
    "error": "Server configuration error"
  }
  ```

**Notes:**
- Each access increments the `accessCount` field
- Updates `lastAccessed` timestamp
- Bills expire after 30 days (configurable via `STORAGE.BILL_TTL_SECONDS`)

---

### Store Bill

Store a new bill or update an existing bill for sharing.

**Endpoint:** `POST /api/bills/[id]`

**Parameters:**
- `id` (path) - Unique bill identifier (string)

**Request Body:**
```json
{
  "bill": {
    "title": "Dinner at Restaurant",
    "items": [
      {
        "id": "item1",
        "name": "Pizza",
        "price": "15.99",
        "method": "even",
        "selectedPeople": ["person1", "person2"]
      }
    ],
    "people": [
      {
        "id": "person1",
        "name": "Alice",
        "color": "#FF5733"
      },
      {
        "id": "person2",
        "name": "Bob",
        "color": "#33FF57"
      }
    ],
    "tax": "2.50",
    "tip": "5.00",
    "discount": "0.00",
    "taxAllocation": "proportional",
    "tipAllocation": "proportional",
    "status": "active"
  }
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Bill stored successfully",
  "billId": "abc123"
}
```

**Error Responses:**

- `400 Bad Request` - Invalid bill ID or data
  ```json
  {
    "error": "Invalid bill data"
  }
  ```

- `500 Internal Server Error` - Failed to store bill
  ```json
  {
    "error": "Failed to store bill"
  }
  ```

**Notes:**
- Automatically adds metadata: `createdAt`, `lastModified`, `accessCount`
- Overwrites existing bill if ID already exists
- Bill is stored in Redis with TTL (Time To Live)

---

## Receipt Scanning API

### Scan Receipt

Upload and scan a receipt image using OCR to extract items.

**Endpoint:** `POST /api/receipt/scan`

**Request:** Multipart form data
- `file` (file) - Receipt image file

**Supported Formats:**
- JPEG (.jpg, .jpeg)
- PNG (.png)
- HEIC/HEIF (.heic, .heif)
- WebP (.webp)

**Maximum File Size:** 5MB

**Response:** `200 OK`
```json
{
  "success": true,
  "items": [
    {
      "name": "Pizza Margherita",
      "price": "15.99"
    },
    {
      "name": "Caesar Salad",
      "price": "8.50"
    }
  ],
  "confidence": "high",
  "provider": "google",
  "preview": "data:image/jpeg;base64,..."
}
```

**Response (No Items Found):** `200 OK`
```json
{
  "success": true,
  "items": [],
  "confidence": "low",
  "warning": "No items detected in receipt",
  "provider": "google",
  "preview": "data:image/jpeg;base64,..."
}
```

**Error Responses:**

- `400 Bad Request` - Invalid file
  ```json
  {
    "success": false,
    "error": "No file provided",
    "code": "INVALID_FILE"
  }
  ```

- `400 Bad Request` - File too large
  ```json
  {
    "success": false,
    "error": "File too large. Maximum size: 5MB",
    "code": "FILE_TOO_LARGE"
  }
  ```

- `401 Unauthorized` - Invalid API key
  ```json
  {
    "success": false,
    "error": "Invalid API key",
    "code": "API_ERROR",
    "provider": "google"
  }
  ```

- `429 Too Many Requests` - Rate limit exceeded
  ```json
  {
    "success": false,
    "error": "API rate limit exceeded. Please try again later.",
    "code": "RATE_LIMIT_ERROR",
    "provider": "google"
  }
  ```

- `500 Internal Server Error` - API key not configured
  ```json
  {
    "success": false,
    "error": "google API key not configured",
    "code": "API_KEY_MISSING",
    "provider": "google"
  }
  ```

- `500 Internal Server Error` - OCR processing failed
  ```json
  {
    "success": false,
    "error": "Failed to process receipt",
    "code": "OCR_API_ERROR",
    "details": "Error message",
    "provider": "google"
  }
  ```

**Configuration:**

Set via environment variables:
- `OCR_PROVIDER` - Provider to use: `google`, `openai`, or `anthropic` (default: `google`)
- `OCR_MODEL` - Optional model name (provider-specific)
- Provider API keys:
  - Google: `GOOGLE_GENERATIVE_AI_API_KEY`, `GEMINI_API_KEY`, or `GOOGLE_API_KEY`
  - OpenAI: `OPENAI_API_KEY`
  - Anthropic: `ANTHROPIC_API_KEY`

**Notes:**
- Preview image is generated for non-HEIC formats (max 1200px width, 85% JPEG quality)
- HEIC files are sent directly to OCR without preview generation
- Returns base64-encoded preview in response

---

## Admin API

### Authentication

All admin endpoints require authentication via session token.

**Authentication Method:** Cookie-based sessions

**Required Cookie:** `admin_session`

### Admin Login

Authenticate as an administrator.

**Endpoint:** `POST /api/admin/login`

**Request Body:**
```json
{
  "password": "your-admin-password"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Logged in successfully"
}
```

**Error Responses:**

- `400 Bad Request` - Missing password
  ```json
  {
    "error": "Password is required"
  }
  ```

- `401 Unauthorized` - Invalid password
  ```json
  {
    "error": "Invalid password"
  }
  ```

**Configuration:**
- Set admin password via `ADMIN_PASSWORD` environment variable

---

### Admin Logout

End the admin session.

**Endpoint:** `POST /api/admin/logout`

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### Get All Bills (Admin)

Retrieve all bills with pagination, filtering, and statistics.

**Endpoint:** `GET /api/admin/bills`

**Authentication:** Required (admin session)

**Query Parameters:**
- `page` (optional) - Page number (default: `1`)
- `limit` (optional) - Bills per page (default: `50`)
- `search` (optional) - Search query (searches title, ID, items, people)
- `status` (optional) - Filter by status: `all`, `active`, `draft`, `closed` (default: `all`)
- `sortBy` (optional) - Sort field: `title`, `status`, `createdAt`, `lastModified`, `size`, `items`, `people`, `total` (default: `lastModified`)
- `sortOrder` (optional) - Sort order: `asc` or `desc` (default: `desc`)

**Example:**
```
GET /api/admin/bills?page=1&limit=20&search=dinner&status=active&sortBy=total&sortOrder=desc
```

**Response:** `200 OK`
```json
{
  "bills": [
    {
      "id": "abc123",
      "bill": { ... },
      "createdAt": "2025-12-04T00:00:00.000Z",
      "lastModified": "2025-12-04T01:00:00.000Z",
      "expiresAt": "2026-01-03T00:00:00.000Z",
      "accessCount": 5,
      "size": 2048,
      "shareUrl": "https://splitsimple.com?share=abc123",
      "totalAmount": 125.50,
      "lastAccessed": "2025-12-04T02:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  },
  "stats": {
    "totalBills": 150,
    "activeBills": 120,
    "draftBills": 20,
    "closedBills": 10,
    "totalItems": 1500,
    "totalPeople": 600,
    "totalStorageSize": 307200,
    "averageBillSize": 2048,
    "totalMoneyProcessed": 15000.00,
    "averageBillValue": 100.00,
    "medianBillValue": 85.50,
    "largestBill": 500.00,
    "smallestBill": 10.00,
    "subtotalRevenue": 13500.00,
    "taxRevenue": 1200.00,
    "tipRevenue": 300.00,
    "totalTaxCollected": 1200.00,
    "totalTipsProcessed": 300.00,
    "totalDiscountsApplied": 0.00,
    "billsWithTax": 140,
    "billsWithTips": 130,
    "billsWithDiscounts": 5,
    "billsCreatedToday": 10,
    "billsCreatedThisWeek": 45,
    "billsCreatedThisMonth": 150,
    "billsCreatedLastWeek": 40,
    "billsCreatedLastMonth": 120,
    "weeklyGrowth": 12.5,
    "monthlyGrowth": 25.0,
    "completionRate": 85.5,
    "shareRate": 75.0,
    "averageAccessCount": 3.2,
    "sharedBills": 112,
    "completedBills": 128,
    "averageItemsPerBill": 10.0,
    "averagePeoplePerBill": 4.0,
    "complexBills": 50,
    "largeBills": 30,
    "popularSplitMethods": [
      {
        "method": "even",
        "count": 800,
        "percentage": 53.3
      },
      {
        "method": "shares",
        "count": 400,
        "percentage": 26.7
      },
      {
        "method": "percentage",
        "count": 200,
        "percentage": 13.3
      },
      {
        "method": "exact",
        "count": 100,
        "percentage": 6.7
      }
    ]
  }
}
```

**Error Responses:**

- `401 Unauthorized` - Not authenticated
  ```json
  {
    "error": "Unauthorized"
  }
  ```

- `500 Internal Server Error` - Failed to fetch bills
  ```json
  {
    "error": "Failed to fetch bills"
  }
  ```

---

### Get Single Bill (Admin)

Retrieve a specific bill by ID.

**Endpoint:** `GET /api/admin/bills/[id]`

**Authentication:** Required (admin session)

**Parameters:**
- `id` (path) - Bill ID

**Response:** `200 OK`
```json
{
  "id": "abc123",
  "bill": { ... },
  "createdAt": "2025-12-04T00:00:00.000Z",
  "lastModified": "2025-12-04T01:00:00.000Z",
  "expiresAt": "2026-01-03T00:00:00.000Z",
  "accessCount": 5,
  "size": 2048,
  "shareUrl": "https://splitsimple.com?share=abc123",
  "totalAmount": 125.50
}
```

---

### Delete Bill (Admin)

Delete a specific bill.

**Endpoint:** `DELETE /api/admin/bills/[id]`

**Authentication:** Required (admin session)

**Parameters:**
- `id` (path) - Bill ID

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Bill deleted successfully"
}
```

---

### Export Bills (Admin)

Export all bills as JSON or CSV.

**Endpoint:** `GET /api/admin/export`

**Authentication:** Required (admin session)

**Query Parameters:**
- `format` (optional) - Export format: `json` or `csv` (default: `json`)

**Response (JSON):** `200 OK` with Content-Type: `application/json`
```json
{
  "bills": [ ... ],
  "exportedAt": "2025-12-04T02:00:00.000Z",
  "totalBills": 150
}
```

**Response (CSV):** `200 OK` with Content-Type: `text/csv`
```csv
id,title,status,createdAt,totalAmount,itemCount,peopleCount
abc123,Dinner,active,2025-12-04T00:00:00.000Z,125.50,10,4
...
```

---

## Error Codes

### Bill Sharing API
- `INVALID_BILL_ID` - Bill ID is missing or malformed
- `BILL_NOT_FOUND` - Bill does not exist or has expired
- `SERVER_CONFIG_ERROR` - Redis or environment configuration issue
- `INVALID_JSON_BODY` - Request body is not valid JSON
- `INVALID_BILL_DATA` - Bill data structure is invalid

### Receipt Scanning API
- `INVALID_FILE` - No file provided or unsupported format
- `FILE_TOO_LARGE` - File exceeds 5MB limit
- `FILE_PROCESSING_ERROR` - Error processing image file
- `API_KEY_MISSING` - OCR provider API key not configured
- `API_ERROR` - Invalid or unauthorized API key
- `RATE_LIMIT_ERROR` - OCR provider rate limit exceeded
- `OCR_API_ERROR` - OCR processing failed
- `INTERNAL_ERROR` - Unexpected server error

### Admin API
- `UNAUTHORIZED` - Authentication required or invalid session
- `INVALID_PASSWORD` - Admin password is incorrect
- `PASSWORD_REQUIRED` - Password field is missing

---

## Rate Limits

### Public Endpoints

**Bill Sharing (`/api/bills/*`):**
- No rate limits currently enforced
- Redis TTL: 30 days per bill

**Receipt Scanning (`/api/receipt/scan`):**
- Rate limits depend on OCR provider:
  - **Google Gemini:** Provider-specific limits
  - **OpenAI:** Provider-specific limits
  - **Anthropic:** Provider-specific limits

### Admin Endpoints

**Admin API (`/api/admin/*`):**
- No rate limits enforced
- Protected by session authentication

---

## Data Models

### Bill Object

```typescript
interface Bill {
  id?: string
  title?: string
  items: Item[]
  people: Person[]
  tax: string
  tip: string
  discount: string
  taxAllocation?: 'proportional' | 'even'
  tipAllocation?: 'proportional' | 'even'
  status?: 'draft' | 'active' | 'closed'
  createdAt?: string
  lastModified?: string
  accessCount?: number
  lastAccessed?: string
}
```

### Item Object

```typescript
interface Item {
  id: string
  name: string
  price: string
  method: 'even' | 'shares' | 'percentage' | 'exact'
  selectedPeople: string[]
  shares?: Record<string, number>
  percentages?: Record<string, number>
  exactAmounts?: Record<string, string>
}
```

### Person Object

```typescript
interface Person {
  id: string
  name: string
  color: string
}
```

---

## Examples

### Sharing a Bill

```javascript
// Create and share a bill
const billId = generateUniqueId()
const response = await fetch(`/api/bills/${billId}`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    bill: {
      title: 'Team Lunch',
      items: [
        {
          id: 'item1',
          name: 'Pizza',
          price: '15.99',
          method: 'even',
          selectedPeople: ['person1', 'person2']
        }
      ],
      people: [
        { id: 'person1', name: 'Alice', color: '#FF5733' },
        { id: 'person2', name: 'Bob', color: '#33FF57' }
      ],
      tax: '2.50',
      tip: '3.00',
      discount: '0.00',
      status: 'active'
    }
  })
})

const data = await response.json()
console.log(`Share URL: ${window.location.origin}?share=${data.billId}`)
```

### Retrieving a Shared Bill

```javascript
// Load a shared bill
const billId = new URLSearchParams(window.location.search).get('share')
const response = await fetch(`/api/bills/${billId}`)
const data = await response.json()

if (data.bill) {
  console.log('Bill loaded:', data.bill)
}
```

### Scanning a Receipt

```javascript
// Upload and scan a receipt
const fileInput = document.querySelector('input[type="file"]')
const file = fileInput.files[0]

const formData = new FormData()
formData.append('file', file)

const response = await fetch('/api/receipt/scan', {
  method: 'POST',
  body: formData
})

const data = await response.json()
if (data.success) {
  console.log('Items found:', data.items)
  console.log('Preview:', data.preview)
}
```

---

## Additional Resources

- [INFRASTRUCTURE.md](./INFRASTRUCTURE.md) - Deployment and Redis setup
- [RECEIPT_SCANNING_SETUP.md](./RECEIPT_SCANNING_SETUP.md) - OCR configuration
- [README.md](./README.md) - Project overview
