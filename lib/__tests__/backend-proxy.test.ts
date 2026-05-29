/**
 * @jest-environment node
 */
import { NextRequest } from "next/server"
import { proxyToBackend } from "@/lib/backend-proxy"

describe("proxyToBackend", () => {
  const originalFetch = global.fetch
  const originalBackendUrl = process.env.CLOUDFLARE_BACKEND_URL
  const originalBackendSecret = process.env.BACKEND_SHARED_SECRET
  let consoleErrorSpy: jest.SpyInstance

  beforeEach(() => {
    process.env.CLOUDFLARE_BACKEND_URL = "https://splitsimple-backend.aarekaz.workers.dev"
    process.env.BACKEND_SHARED_SECRET = "test-secret"
    global.fetch = jest.fn()
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {})
  })

  afterEach(() => {
    global.fetch = originalFetch
    process.env.CLOUDFLARE_BACKEND_URL = originalBackendUrl
    process.env.BACKEND_SHARED_SECRET = originalBackendSecret
    consoleErrorSpy.mockRestore()
    jest.clearAllMocks()
  })

  it("removes upstream compression headers before returning the response", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue(
      new Response(JSON.stringify({ bill: { id: "bill-123" } }), {
        status: 200,
        headers: {
          "content-type": "application/json",
          "content-encoding": "br",
          "content-length": "123",
          "transfer-encoding": "chunked",
        },
      })
    )

    const request = new NextRequest("https://splitsimple.anuragd.me/api/bills/bill-123")
    const response = await proxyToBackend(request, "/api/bills/bill-123")

    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toBe("application/json")
    expect(response.headers.has("content-encoding")).toBe(false)
    expect(response.headers.has("content-length")).toBe(false)
    expect(response.headers.has("transfer-encoding")).toBe(false)
    await expect(response.json()).resolves.toEqual({ bill: { id: "bill-123" } })
  })

  it("forwards query params and shared-secret auth to the backend", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }))

    const request = new NextRequest("https://splitsimple.anuragd.me/api/bills/bill-123?view=full")
    await proxyToBackend(request, "/api/bills/bill-123")

    expect(global.fetch).toHaveBeenCalledTimes(1)
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0]
    expect(String(url)).toBe("https://splitsimple-backend.aarekaz.workers.dev/api/bills/bill-123?view=full")
    expect(init.headers.get("x-splitsimple-backend-secret")).toBe("test-secret")
    expect(init.headers.get("x-splitsimple-public-url")).toBe("https://splitsimple.anuragd.me")
  })

  it("returns a readable 502 when the backend fetch fails", async () => {
    ;(global.fetch as jest.Mock).mockRejectedValue(new TypeError("fetch failed"))

    const request = new NextRequest("https://splitsimple.anuragd.me/api/bills/bill-123")
    const response = await proxyToBackend(request, "/api/bills/bill-123")

    expect(response.status).toBe(502)
    await expect(response.json()).resolves.toEqual({ error: "Backend service is unavailable" })
  })
})
