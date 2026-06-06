import { cookies } from 'next/headers'
import { type NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE } from '@web/lib/session'

const ALLOWED_METHODS = ['GET', 'POST', 'PATCH', 'DELETE'] as const
type AllowedMethod = (typeof ALLOWED_METHODS)[number]

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
  const token = sessionRaw
    ? (JSON.parse(sessionRaw) as { accessToken?: string }).accessToken
    : undefined

  const method = req.method as AllowedMethod

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-cloudflare-secret': cfSecret,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }

  let body: string | undefined
  if (method !== 'GET' && method !== 'DELETE') {
    body = await req.text()
  }

  const upstreamRes = await fetch(upstream, {
    method,
    headers,
    ...(body !== undefined ? { body } : {}),
    cache: 'no-store',
  })

  const data: unknown = await upstreamRes.json().catch(() => null)
  return NextResponse.json(data, { status: upstreamRes.status })
}

export const GET = handler
export const POST = handler
export const PATCH = handler
export const DELETE = handler
