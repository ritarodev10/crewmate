'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { FIXTURE_SESSIONS, SESSION_COOKIE, roleToRedirect } from '@web/lib/session'

export async function loginAction(email: string, _password: string): Promise<{ error: string } | never> {
  const session = FIXTURE_SESSIONS[email.toLowerCase()]
  if (!session) {
    return { error: 'No account found for this email. Try admin@crewmate.demo.' }
  }

  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, JSON.stringify(session), {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })

  redirect(roleToRedirect(session.role))
}
