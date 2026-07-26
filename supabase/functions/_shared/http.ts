const DEFAULT_ALLOWED_ORIGINS = [
  'https://poker-manager.pages.dev',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:4173',
]

function configuredOrigins() {
  const configured = Deno.env.get('ALLOWED_ORIGINS')
  if (!configured) return DEFAULT_ALLOWED_ORIGINS
  return configured
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
}

export function corsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get('origin')
  const allowed = configuredOrigins()
  const allowOrigin = origin && allowed.includes(origin) ? origin : allowed[0]

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers':
      'authorization, apikey, content-type, x-client-info, x-cron-secret, svix-id, svix-signature, svix-timestamp, plaid-verification',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}
export function json(
  request: Request,
  body: unknown,
  status = 200,
  extraHeaders?: HeadersInit,
) {
  const headers = new Headers(corsHeaders(request))
  headers.set('Content-Type', 'application/json; charset=utf-8')
  headers.set('Cache-Control', 'no-store')
  if (extraHeaders) {
    new Headers(extraHeaders).forEach((value, key) => headers.set(key, value))
  }
  return new Response(JSON.stringify(body), { status, headers })
}

export function options(request: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(request) })
}

export async function readJson<T>(request: Request, maxBytes = 32_768): Promise<T> {
  const contentLength = Number(request.headers.get('content-length') ?? 0)
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new HttpError(413, 'Request body is too large.')
  }

  const raw = await request.text()
  if (new TextEncoder().encode(raw).byteLength > maxBytes) {
    throw new HttpError(413, 'Request body is too large.')
  }

  try {
    return JSON.parse(raw) as T
  } catch {
    throw new HttpError(400, 'Request body must be valid JSON.')
  }
}

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'HttpError'
  }
}

export function errorResponse(request: Request, error: unknown) {
  if (error instanceof HttpError) {
    return json(request, { error: error.message }, error.status)
  }

  console.error('Unhandled Edge Function error', error)
  return json(request, { error: 'The request could not be completed.' }, 500)
}

export function requirePost(request: Request) {
  if (request.method !== 'POST') {
    throw new HttpError(405, 'Method not allowed.')
  }
}
