import type { Bill } from "@/lib/bill-types"
import { STORAGE } from "@/lib/constants"
import { isMigratableBill, migrateBillSchema } from "@/lib/validation"

export interface BillRecord {
  id: string
  bill: Bill
  createdAt: string
  lastModified: string
  expiresAt: string
  accessCount: number
  lastAccessed?: string
  size: number
  ttl: number
}

interface D1Result<T = unknown> {
  results?: T[]
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement
  first<T = unknown>(): Promise<T | null>
  all<T = unknown>(): Promise<D1Result<T>>
  run(): Promise<D1Result>
}

export interface D1DatabaseLike {
  prepare(query: string): D1PreparedStatement
}

interface BillRow {
  id: string
  bill_json: string
  created_at: string
  last_modified: string
  expires_at: string
  access_count: number
  last_accessed: string | null
  size_bytes: number
}

interface SaveBillOptions {
  createdAt?: string
  expiresAt?: string
}

const BILL_COLUMNS = `
  id,
  bill_json,
  created_at,
  last_modified,
  expires_at,
  access_count,
  last_accessed,
  size_bytes
`

function nowIso(): string {
  return new Date().toISOString()
}

function getDefaultExpiresAt(): string {
  return new Date(Date.now() + STORAGE.BILL_TTL_SECONDS * 1000).toISOString()
}

function getTtlSeconds(expiresAt: string): number {
  return Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))
}

function hydrateBillRecord(row: BillRow): BillRecord | null {
  let parsedBill: unknown

  try {
    parsedBill = JSON.parse(row.bill_json)
  } catch {
    return null
  }

  if (!isMigratableBill(parsedBill)) {
    return null
  }

  const bill = migrateBillSchema(parsedBill)
  const lastAccessed = row.last_accessed || bill.lastAccessed

  return {
    id: row.id,
    bill: {
      ...bill,
      createdAt: bill.createdAt || row.created_at,
      lastModified: bill.lastModified || row.last_modified,
      accessCount: row.access_count,
      lastAccessed,
    },
    createdAt: row.created_at,
    lastModified: row.last_modified,
    expiresAt: row.expires_at,
    accessCount: row.access_count,
    lastAccessed,
    size: row.size_bytes,
    ttl: getTtlSeconds(row.expires_at),
  }
}

export class D1BillStore {
  constructor(private readonly db: D1DatabaseLike) {}

  async getBill(id: string, options: { incrementAccess?: boolean } = {}): Promise<BillRecord | null> {
    const row = await this.db
      .prepare(`SELECT ${BILL_COLUMNS} FROM bills WHERE id = ? AND expires_at > ?`)
      .bind(id, nowIso())
      .first<BillRow>()

    if (!row) {
      return null
    }

    const record = hydrateBillRecord(row)
    if (!record || !options.incrementAccess) {
      return record
    }

    const accessedAt = nowIso()
    const updatedBill: Bill = {
      ...record.bill,
      accessCount: record.accessCount + 1,
      lastAccessed: accessedAt,
    }

    return this.saveBill(id, updatedBill, {
      createdAt: record.createdAt,
      expiresAt: getDefaultExpiresAt(),
    })
  }

  async saveBill(id: string, bill: Bill, options: SaveBillOptions = {}): Promise<BillRecord> {
    const timestamp = nowIso()
    const createdAt = options.createdAt || bill.createdAt || timestamp
    const lastModified = bill.lastModified || timestamp
    const expiresAt = options.expiresAt || getDefaultExpiresAt()
    const accessCount = bill.accessCount || 0
    const lastAccessed = bill.lastAccessed || null
    const normalizedBill: Bill = {
      ...bill,
      id,
      createdAt,
      lastModified,
      accessCount,
      lastAccessed: lastAccessed || undefined,
    }
    const billJson = JSON.stringify(normalizedBill)
    const sizeBytes = billJson.length

    await this.db
      .prepare(`
        INSERT INTO bills (
          id,
          bill_json,
          title,
          status,
          created_at,
          last_modified,
          expires_at,
          access_count,
          last_accessed,
          size_bytes
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          bill_json = excluded.bill_json,
          title = excluded.title,
          status = excluded.status,
          created_at = excluded.created_at,
          last_modified = excluded.last_modified,
          expires_at = excluded.expires_at,
          access_count = excluded.access_count,
          last_accessed = excluded.last_accessed,
          size_bytes = excluded.size_bytes
      `)
      .bind(
        id,
        billJson,
        normalizedBill.title || "",
        normalizedBill.status || "draft",
        createdAt,
        lastModified,
        expiresAt,
        accessCount,
        lastAccessed,
        sizeBytes
      )
      .run()

    const savedBill = await this.getBill(id)
    if (!savedBill) {
      throw new Error("D1 bill write did not return a readable bill")
    }

    return savedBill
  }

  async listBills(): Promise<BillRecord[]> {
    const result = await this.db
      .prepare(`SELECT ${BILL_COLUMNS} FROM bills WHERE expires_at > ? ORDER BY last_modified DESC`)
      .bind(nowIso())
      .all<BillRow>()

    return (result.results || [])
      .map(hydrateBillRecord)
      .filter((record): record is BillRecord => record !== null)
  }

  async deleteBill(id: string): Promise<void> {
    await this.db.prepare("DELETE FROM bills WHERE id = ?").bind(id).run()
  }

  async extendBill(id: string, days: number): Promise<boolean> {
    const record = await this.getBill(id)
    if (!record) {
      return false
    }

    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
    await this.db
      .prepare("UPDATE bills SET expires_at = ? WHERE id = ?")
      .bind(expiresAt, id)
      .run()

    return true
  }

  async deleteExpiredBills(): Promise<void> {
    await this.db.prepare("DELETE FROM bills WHERE expires_at <= ?").bind(nowIso()).run()
  }
}

export async function getBillStore(): Promise<D1BillStore> {
  const { getCloudflareContext } = await import("@opennextjs/cloudflare")
  const { env } = await getCloudflareContext({ async: true })
  const db = (env as { DB?: D1DatabaseLike }).DB

  if (!db) {
    throw new Error("Cloudflare D1 binding DB is not configured")
  }

  return new D1BillStore(db)
}
