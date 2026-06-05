import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Inline types and helpers — @web/* aliases don't resolve in Edge runtime
type UserRole = 'SUPER_ADMIN' | 'MANAGER' | 'TEAM_LEAD' | 'WORKER'

interface Session {
  userId: string
  name: string
  role: UserRole
  operatorId: string
  avatarUrl?: string
  teamId?: string
  workerId?: string
}

const SESSION_COOKIE = 'crewmate_session'
const DEMO_ACTOR_COOKIE = 'demo_actor'

function roleToRedirect(role: UserRole): string {
  if (role === 'WORKER') return '/worker'
  return '/dashboard'
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  let session: Session | null = null
  const demoActorRaw = request.cookies.get(DEMO_ACTOR_COOKIE)?.value
  const sessionRaw = request.cookies.get(SESSION_COOKIE)?.value

  try {
    if (demoActorRaw) session = JSON.parse(demoActorRaw) as Session
    else if (sessionRaw) session = JSON.parse(sessionRaw) as Session
  } catch {
    session = null
  }

  const isProtected = ['/dashboard', '/jobs', '/workforce', '/revenue'].some(p =>
    pathname.startsWith(p)
  )
  const isWorkerRoute = pathname.startsWith('/worker')
  const isAuthRoute = pathname === '/login' || pathname === '/'

  if (!session && isProtected) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  if (session && isAuthRoute) {
    return NextResponse.redirect(new URL(roleToRedirect(session.role), request.url))
  }
  if (session && session.role === 'WORKER' && isProtected) {
    return NextResponse.redirect(new URL('/worker', request.url))
  }
  if (session && session.role !== 'WORKER' && isWorkerRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|images|api).*)'],
}
