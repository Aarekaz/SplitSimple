import { NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.CLOUDFLARE_BACKEND_URL
const BACKEND_SHARED_SECRET = process.env.BACKEND_SHARED_SECRET

function getBackendUrl(path: string, request: NextRequest): URL | null {
  if (!BACKEND_URL) return null

  const url = new URL(path, BACKEND_URL)
  url.search = request.nextUrl.search
  return url
}

export async function proxyToBackend(
  request: NextRequest,
  path: string
): Promise<NextResponse> {
  const backendUrl = getBackendUrl(path, request)
  if (!backendUrl) {
    return NextResponse.json(
      { error: "Backend URL is not configured" },
      { status: 500 }
    )
  }

  const headers = new Headers()
  const contentType = request.headers.get("content-type")
  const accept = request.headers.get("accept")

  if (contentType) headers.set("content-type", contentType)
  if (accept) headers.set("accept", accept)
  if (BACKEND_SHARED_SECRET) {
    headers.set("x-splitsimple-backend-secret", BACKEND_SHARED_SECRET)
  }
  headers.set("x-splitsimple-public-url", request.nextUrl.origin)

  let body: BodyInit | undefined
  if (request.method !== "GET" && request.method !== "HEAD") {
    body = await request.arrayBuffer()
  }

  const backendResponse = await fetch(backendUrl, {
    method: request.method,
    headers,
    body,
  })

  return new NextResponse(backendResponse.body, {
    status: backendResponse.status,
    headers: backendResponse.headers,
  })
}
