import { cookies } from 'next/headers'
import { type NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE } from '@web/lib/session'

const ALLOWED_METHODS = ['GET', 'POST', 'PATCH', 'DELETE'] as const
type AllowedMethod = (typeof ALLOWED_METHODS)[number]

interface StoredSession {
  accessToken?: string
  refreshToken?: string
  [key: string]: unknown
}

async function tryRefresh(
  apiUrl: string,
  cfSecret: string,
  refreshToken: string,
): Promise<string | null> {
  try {
    const res = await fetch(`${apiUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-cloudflare-secret': cfSecret },
      body: JSON.stringify({ refreshToken }),
      cache: 'no-store',
    })
    if (!res.ok) return null
    const json = (await res.json()) as { data?: { accessToken?: string } }
    return json.data?.accessToken ?? null
  } catch {
    return null
  }
}

async function handler(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
): Promise<NextResponse> {
  const apiUrl = process.env['API_URL']
  const cfSecret = process.env['CLOUDFLARE_SECRET']

  if (!apiUrl || !cfSecret) {
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
  }

  const { path } = await params
  const upstreamPath = '/' + path.join('/')
  const search = req.nextUrl.search
  const upstream = `${apiUrl}${upstreamPath}${search}`

  const cookieStore = await cookies()
  const sessionRaw = cookieStore.get(SESSION_COOKIE)?.value
  const session: StoredSession | null = sessionRaw ? (JSON.parse(sessionRaw) as StoredSession) : null
  let token = session?.accessToken

  const method = req.method as AllowedMethod

  const buildHeaders = (t: string | undefined): Record<string, string> => ({
    'Content-Type': 'application/json',
    'x-cloudflare-secret': cfSecret,
    ...(t ? { Authorization: `Bearer ${t}` } : {}),
  })

  let body: string | undefined
  if (method !== 'GET' && method !== 'DELETE') {
    body = await req.text()
  }

  const fetchUpstream = (t: string | undefined) =>
    fetch(upstream, {
      method,
      headers: buildHeaders(t),
      ...(body !== undefined ? { body } : {}),
      cache: 'no-store',
    })

  let upstreamRes = await fetchUpstream(token)

  // On 401, attempt a silent token refresh and retry once
  if (upstreamRes.status === 401 && session?.refreshToken) {
    const newToken = await tryRefresh(apiUrl, cfSecret, session.refreshToken)
    if (newToken) {
      // Persist new access token back into the session cookie
      const updatedSession: StoredSession = { ...session, accessToken: newToken }
      cookieStore.set(SESSION_COOKIE, JSON.stringify(updatedSession), {
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
      })
      token = newToken
      upstreamRes = await fetchUpstream(token)
    }
  }

  const data: unknown = await upstreamRes.json().catch(() => null)
  return NextResponse.json(data, { status: upstreamRes.status })
}

export const GET = handler
export const POST = handler
export const PATCH = handler
export const DELETE = handler
