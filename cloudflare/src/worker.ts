import { getBillSummary } from "../../lib/calculations"
import type { AdminBillMetadata, AdminStats, Bill } from "../../lib/bill-types"
import { isMigratableBill, isRecord, migrateBillSchema } from "../../lib/validation"
import { D1BillStore, type D1DatabaseLike } from "./bill-store"

interface Env {
  DB: D1DatabaseLike
  BACKEND_SHARED_SECRET: string
}

interface RouteContext {
  params: Promise<{ id: string }>
}

function json(data: unknown, init?: ResponseInit): Response {
  return Response.json(data, init)
}

function unauthorized(): Response {
  return json({ error: "Unauthorized" }, { status: 401 })
}

function getBaseUrl(request: Request): string {
  const proxyUrl = request.headers.get("x-splitsimple-public-url")
  if (proxyUrl) return proxyUrl

  const forwardedProto = request.headers.get("x-forwarded-proto") || "https"
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "localhost:3000"
  return `${forwardedProto}://${host}`
}

function requireBackendSecret(request: Request, env: Env): Response | null {
  const secret = request.headers.get("x-splitsimple-backend-secret")
  if (!env.BACKEND_SHARED_SECRET || secret !== env.BACKEND_SHARED_SECRET) {
    return unauthorized()
  }

  return null
}

async function parseJsonBody(request: Request): Promise<unknown | Response> {
  try {
    return await request.json()
  } catch (error) {
    console.error("Invalid JSON body received:", error)
    return json({ error: "Invalid JSON body" }, { status: 400 })
  }
}

async function handlePublicBillGet(request: Request, env: Env, id: string): Promise<Response> {
  if (!id || typeof id !== "string") {
    return json({ error: "Invalid bill ID" }, { status: 400 })
  }

  const store = new D1BillStore(env.DB)
  const billRecord = await store.getBill(id, { incrementAccess: true })

  if (!billRecord) {
    return json({ error: "Bill not found or expired" }, { status: 404 })
  }

  return json({ bill: billRecord.bill })
}

async function handlePublicBillPost(request: Request, env: Env, id: string): Promise<Response> {
  if (!id || typeof id !== "string") {
    return json({ error: "Invalid bill ID" }, { status: 400 })
  }

  const body = await parseJsonBody(request)
  if (body instanceof Response) return body

  const bill = isRecord(body) ? body.bill : undefined
  if (!isMigratableBill(bill)) {
    return json({ error: "Invalid bill data" }, { status: 400 })
  }

  const now = new Date().toISOString()
  const migratedBill = migrateBillSchema(bill)
  const billWithMetadata = {
    ...migratedBill,
    createdAt: migratedBill.createdAt || now,
    lastModified: migratedBill.lastModified || now,
    accessCount: migratedBill.accessCount || 0
  }

  const store = new D1BillStore(env.DB)
  await store.saveBill(id, billWithMetadata)

  return json({
    success: true,
    message: "Bill stored successfully",
    billId: id
  })
}

function getMedian(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

async function handleAdminBillsGet(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)
  const page = parseInt(url.searchParams.get("page") || "1")
  const limit = parseInt(url.searchParams.get("limit") || "50")
  const search = url.searchParams.get("search") || ""
  const status = url.searchParams.get("status") || "all"
  const sortBy = url.searchParams.get("sortBy") || "lastModified"
  const sortOrder = url.searchParams.get("sortOrder") || "desc"
  const baseUrl = getBaseUrl(request)

  const store = new D1BillStore(env.DB)
  const billRecords = await store.listBills()
  let bills: AdminBillMetadata[] = billRecords.map((record) => {
    const billSummary = getBillSummary(record.bill)
    return {
      id: record.id,
      bill: record.bill,
      createdAt: record.createdAt,
      lastModified: record.lastModified,
      expiresAt: record.expiresAt,
      accessCount: record.accessCount,
      size: record.size,
      shareUrl: `${baseUrl}?share=${record.id}`,
      totalAmount: billSummary.total,
      lastAccessed: record.lastAccessed,
    }
  })

  if (search) {
    bills = bills.filter(b =>
      b.bill.title?.toLowerCase().includes(search.toLowerCase()) ||
      b.id.includes(search) ||
      b.bill.items?.some(item => item.name.toLowerCase().includes(search.toLowerCase())) ||
      b.bill.people?.some(person => person.name.toLowerCase().includes(search.toLowerCase()))
    )
  }

  if (status !== "all") {
    bills = bills.filter(b => b.bill.status === status)
  }

  bills.sort((a, b) => {
    let compareValue = 0
    switch (sortBy) {
      case "title":
        compareValue = (a.bill.title || "").localeCompare(b.bill.title || "")
        break
      case "status":
        compareValue = (a.bill.status || "").localeCompare(b.bill.status || "")
        break
      case "createdAt":
        compareValue = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        break
      case "lastModified":
        compareValue = new Date(a.lastModified).getTime() - new Date(b.lastModified).getTime()
        break
      case "size":
        compareValue = a.size - b.size
        break
      case "items":
        compareValue = (a.bill.items?.length || 0) - (b.bill.items?.length || 0)
        break
      case "people":
        compareValue = (a.bill.people?.length || 0) - (b.bill.people?.length || 0)
        break
      case "total":
        compareValue = a.totalAmount - b.totalAmount
        break
      default:
        compareValue = new Date(a.lastModified).getTime() - new Date(b.lastModified).getTime()
    }

    return sortOrder === "desc" ? -compareValue : compareValue
  })

  const startIndex = (page - 1) * limit
  const endIndex = startIndex + limit
  const paginatedBills = bills.slice(startIndex, endIndex)

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastWeekStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  const totalBills = bills.length
  const activeBills = bills.filter(b => b.bill.status === "active").length
  const draftBills = bills.filter(b => b.bill.status === "draft").length
  const closedBills = bills.filter(b => b.bill.status === "closed").length

  const totalMoneyProcessed = bills.reduce((sum, b) => sum + b.totalAmount, 0)
  const averageBillValue = totalBills > 0 ? totalMoneyProcessed / totalBills : 0
  const medianBillValue = totalBills > 0 ? getMedian(bills.map(b => b.totalAmount)) : 0
  const largestBill = bills.reduce((max, b) => Math.max(max, b.totalAmount), 0)
  const smallestBill = totalBills > 0 ? bills.reduce((min, b) => Math.min(min, b.totalAmount), Infinity) : 0

  const totalTaxCollected = bills.reduce((sum, b) => sum + (parseFloat(b.bill.tax) || 0), 0)
  const totalTipsProcessed = bills.reduce((sum, b) => sum + (parseFloat(b.bill.tip) || 0), 0)
  const totalDiscountsApplied = bills.reduce((sum, b) => sum + (parseFloat(b.bill.discount) || 0), 0)

  const subtotalRevenue = totalMoneyProcessed - totalTaxCollected - totalTipsProcessed + totalDiscountsApplied
  const taxRevenue = totalTaxCollected
  const tipRevenue = totalTipsProcessed

  const billsCreatedToday = bills.filter(b => {
    if (!b.createdAt) return false
    const created = new Date(b.createdAt)
    return !isNaN(created.getTime()) && created >= todayStart
  }).length

  const billsCreatedThisWeek = bills.filter(b => {
    if (!b.createdAt) return false
    const created = new Date(b.createdAt)
    return !isNaN(created.getTime()) && created >= weekStart
  }).length

  const billsCreatedThisMonth = bills.filter(b => {
    if (!b.createdAt) return false
    const created = new Date(b.createdAt)
    return !isNaN(created.getTime()) && created >= monthStart
  }).length

  const billsCreatedLastWeek = bills.filter(b => {
    if (!b.createdAt) return false
    const created = new Date(b.createdAt)
    return !isNaN(created.getTime()) && created >= lastWeekStart && created < weekStart
  }).length

  const billsCreatedLastMonth = bills.filter(b => {
    if (!b.createdAt) return false
    const created = new Date(b.createdAt)
    return !isNaN(created.getTime()) && created >= lastMonthStart && created < monthStart
  }).length

  const weeklyGrowth = billsCreatedLastWeek > 0
    ? ((billsCreatedThisWeek - billsCreatedLastWeek) / billsCreatedLastWeek) * 100
    : billsCreatedThisWeek > 0
      ? 100
      : 0

  const monthlyGrowth = billsCreatedLastMonth > 0
    ? ((billsCreatedThisMonth - billsCreatedLastMonth) / billsCreatedLastMonth) * 100
    : billsCreatedThisMonth > 0
      ? 100
      : 0

  const sharedBills = bills.filter(b => {
    const hasMultiplePeople = (b.bill.people?.length || 0) > 1
    const hasMultipleAccesses = (b.accessCount || 0) > 1
    const hasItems = (b.bill.items?.length || 0) > 0
    return hasItems && (hasMultiplePeople || hasMultipleAccesses)
  }).length

  const shareRate = totalBills > 0 ? (sharedBills / totalBills) * 100 : 0

  const completedBills = bills.filter(b => {
    const hasContent = (b.bill.items?.length || 0) > 0 && (b.bill.people?.length || 0) > 0
    const isMarkedClosed = b.bill.status === "closed"
    const hasActivity = (b.accessCount || 0) > 0
    return hasContent && (isMarkedClosed || hasActivity)
  }).length

  const completionRate = totalBills > 0 ? (completedBills / totalBills) * 100 : 0
  const averageAccessCount = totalBills > 0 ? bills.reduce((sum, b) => sum + (b.accessCount || 0), 0) / totalBills : 0

  const totalItems = bills.reduce((sum, b) => sum + (b.bill.items?.length || 0), 0)
  const totalPeople = bills.reduce((sum, b) => sum + (b.bill.people?.length || 0), 0)
  const averageItemsPerBill = totalBills > 0 ? totalItems / totalBills : 0
  const averagePeoplePerBill = totalBills > 0 ? totalPeople / totalBills : 0

  const billsWithTax = bills.filter(b => parseFloat(b.bill.tax) > 0).length
  const billsWithTips = bills.filter(b => parseFloat(b.bill.tip) > 0).length
  const billsWithDiscounts = bills.filter(b => parseFloat(b.bill.discount) > 0).length
  const complexBills = bills.filter(b => (b.bill.items?.length || 0) > 5).length
  const largeBills = bills.filter(b => (b.bill.people?.length || 0) > 4).length

  const splitMethodCounts: Record<string, number> = {}
  let totalMethodCount = 0
  bills.forEach(bill => {
    bill.bill.items?.forEach(item => {
      const method = item.method || "even"
      splitMethodCounts[method] = (splitMethodCounts[method] || 0) + 1
      totalMethodCount++
    })
  })

  const popularSplitMethods = Object.entries(splitMethodCounts)
    .map(([method, count]) => ({
      method,
      count,
      percentage: totalMethodCount > 0 ? (count / totalMethodCount) * 100 : 0
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 4)

  const stats: AdminStats = {
    totalBills,
    activeBills,
    draftBills,
    closedBills,
    totalItems,
    totalPeople,
    totalStorageSize: bills.reduce((sum, b) => sum + b.size, 0),
    averageBillSize: totalBills > 0 ? bills.reduce((sum, b) => sum + b.size, 0) / totalBills : 0,
    totalMoneyProcessed,
    averageBillValue,
    medianBillValue,
    largestBill,
    smallestBill: smallestBill === Infinity ? 0 : smallestBill,
    subtotalRevenue,
    taxRevenue,
    tipRevenue,
    totalTaxCollected,
    totalTipsProcessed,
    totalDiscountsApplied,
    billsWithTax,
    billsWithTips,
    billsWithDiscounts,
    billsCreatedToday,
    billsCreatedThisWeek,
    billsCreatedThisMonth,
    billsCreatedLastWeek,
    billsCreatedLastMonth,
    weeklyGrowth,
    monthlyGrowth,
    completionRate,
    shareRate,
    averageAccessCount,
    sharedBills,
    completedBills,
    averageItemsPerBill,
    averagePeoplePerBill,
    complexBills,
    largeBills,
    popularSplitMethods
  }

  return json({
    bills: paginatedBills,
    stats,
    pagination: {
      page,
      limit,
      totalPages: Math.ceil(totalBills / limit),
      totalItems: totalBills
    }
  })
}

async function handleAdminBillsByIdGet(request: Request, env: Env, id: string): Promise<Response> {
  const store = new D1BillStore(env.DB)
  const billRecord = await store.getBill(id)
  if (!billRecord) {
    return json({ error: "Bill not found" }, { status: 404 })
  }

  return json({
    id,
    bill: billRecord.bill,
    metadata: {
      ttl: billRecord.ttl,
      expiresAt: billRecord.expiresAt,
      size: billRecord.size,
      createdAt: billRecord.createdAt,
      lastModified: billRecord.lastModified
    }
  })
}

async function handleAdminBillsByIdPut(request: Request, env: Env, id: string): Promise<Response> {
  const body = await parseJsonBody(request)
  if (body instanceof Response) return body

  if (!isMigratableBill(body)) {
    return json({ error: "Invalid bill data" }, { status: 400 })
  }

  const updatedBill = {
    ...migrateBillSchema(body),
    lastModified: new Date().toISOString()
  }

  const store = new D1BillStore(env.DB)
  await store.saveBill(id, updatedBill)

  return json({
    success: true,
    message: "Bill updated successfully",
    bill: updatedBill
  })
}

async function handleAdminBillsByIdDelete(request: Request, env: Env, id: string): Promise<Response> {
  const store = new D1BillStore(env.DB)
  await store.deleteBill(id)
  return json({
    success: true,
    message: "Bill deleted successfully"
  })
}

async function handleAdminBillsByIdPatch(request: Request, env: Env, id: string): Promise<Response> {
  const body = await parseJsonBody(request)
  if (body instanceof Response) return body

  const days = isRecord(body) && typeof body.days === "number" ? body.days : 30
  const store = new D1BillStore(env.DB)
  const billExists = await store.extendBill(id, days)

  if (!billExists) {
    return json({ error: "Bill not found" }, { status: 404 })
  }

  return json({
    success: true,
    message: `Bill expiration extended by ${days} days`
  })
}

async function handleAdminExport(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)
  const format = url.searchParams.get("format") || "json"
  const store = new D1BillStore(env.DB)
  const bills = (await store.listBills()).map((record) => ({
    id: record.id,
    bill: record.bill,
    createdAt: record.createdAt,
    lastModified: record.lastModified,
    expiresAt: record.expiresAt,
  }))

  if (format === "csv") {
    const headers = [
      "ID",
      "Title",
      "Status",
      "Created At",
      "Last Modified",
      "Total Items",
      "Total People",
      "Tax",
      "Tip",
      "Discount",
      "Notes"
    ]

    const rows = bills.map(b => [
      b.id,
      b.bill.title || "",
      b.bill.status || "",
      b.createdAt || "",
      b.lastModified || "",
      b.bill.items?.length || 0,
      b.bill.people?.length || 0,
      b.bill.tax || "0",
      b.bill.tip || "0",
      b.bill.discount || "0",
      b.bill.notes || ""
    ])

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n")

    return new Response(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="bills_export_${new Date().toISOString()}.csv"`
      }
    })
  }

  return new Response(JSON.stringify(bills, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="bills_export_${new Date().toISOString()}.json"`
    }
  })
}

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const secretError = requireBackendSecret(request, env)
    if (secretError) return secretError

    const url = new URL(request.url)
    const pathname = url.pathname

    if (pathname.startsWith("/api/bills/")) {
      const id = pathname.split("/").pop() || ""
      if (request.method === "GET") return handlePublicBillGet(request, env, id)
      if (request.method === "POST") return handlePublicBillPost(request, env, id)
      return json({ error: "Method not allowed" }, { status: 405 })
    }

    if (pathname === "/api/admin/bills" && request.method === "GET") {
      return handleAdminBillsGet(request, env)
    }

    if (pathname.startsWith("/api/admin/bills/")) {
      const id = pathname.split("/").pop() || ""
      if (request.method === "GET") return handleAdminBillsByIdGet(request, env, id)
      if (request.method === "PUT") return handleAdminBillsByIdPut(request, env, id)
      if (request.method === "DELETE") return handleAdminBillsByIdDelete(request, env, id)
      if (request.method === "PATCH") return handleAdminBillsByIdPatch(request, env, id)
      return json({ error: "Method not allowed" }, { status: 405 })
    }

    if (pathname === "/api/admin/export" && request.method === "GET") {
      return handleAdminExport(request, env)
    }

    return json({ error: "Not found" }, { status: 404 })
  }
}

export default worker
