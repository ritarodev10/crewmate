import { type NextRequest, NextResponse } from 'next/server';

const PUBLIC_ROUTES = ['/login'];
const TODAY_ROUTES = ['/today'];

export function middleware(request: NextRequest): NextResponse {
  const session = request.cookies.get('crewmate_session');
  const { pathname } = request.nextUrl;

  // Allow public routes without session
  if (PUBLIC_ROUTES.some((r) => pathname.startsWith(r))) {
    return NextResponse.next();
  }

  // If no session, redirect to login
  if (!session?.value) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    return NextResponse.redirect(loginUrl);
  }

  // Parse session to enforce role-based routing
  let role: string | null = null;
  try {
    const parsed = JSON.parse(session.value) as { role: string };
    role = parsed.role;
  } catch {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    return NextResponse.redirect(loginUrl);
  }

  // Workers can only access /today routes
  if (role === 'worker' && !TODAY_ROUTES.some((r) => pathname.startsWith(r))) {
    const todayUrl = request.nextUrl.clone();
    todayUrl.pathname = '/today';
    return NextResponse.redirect(todayUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};
