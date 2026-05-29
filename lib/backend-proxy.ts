import { NextRequest, NextResponse } from "next/server"

function getBackendUrl(path: string, request: NextRequest): URL | null {
  const backendUrl = process.env.CLOUDFLARE_BACKEND_URL
  if (!backendUrl) return null

  const url = new URL(path, backendUrl)
  url.search = request.nextUrl.search
  return url
}

function getProxyResponseHeaders(headers: Headers): Headers {
  const proxyHeaders = new Headers(headers)

  // Node fetch can transparently decode compressed upstream bodies while retaining
  // the original content-encoding headers. Forwarding those headers causes browsers
  // to attempt a second decode and reject the response.
  proxyHeaders.delete("content-encoding")
  proxyHeaders.delete("content-length")
  proxyHeaders.delete("transfer-encoding")

  return proxyHeaders
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
  const backendSharedSecret = process.env.BACKEND_SHARED_SECRET
  if (backendSharedSecret) {
    headers.set("x-splitsimple-backend-secret", backendSharedSecret)
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
  }).catch((error: unknown) => {
    console.error("Backend proxy request failed:", error)
    return null
  })

  if (!backendResponse) {
    return NextResponse.json(
      { error: "Backend service is unavailable" },
      { status: 502 }
    )
  }

  return new NextResponse(backendResponse.body, {
    status: backendResponse.status,
    headers: getProxyResponseHeaders(backendResponse.headers),
  })
}
