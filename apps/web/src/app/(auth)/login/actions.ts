'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { apiFetch } from '@web/lib/api'
import { FIXTURE_SESSIONS, SESSION_COOKIE, roleToRedirect, type Session } from '@web/lib/session'
import type { ApiResponse } from '@web/types/api'
import type { UserRole } from '@web/stores/auth'

interface LoginData {
  accessToken: string
  user: { id: string; email: string; role: string; name: string; operatorId: string }
}

export async function loginAction(email: string, password: string): Promise<{ error: string } | never> {
  try {
    const res = await apiFetch<ApiResponse<LoginData>>('/auth/login', {
      method: 'POST',
      body: { email, password },
    })

    const { accessToken, user } = res.data
    // Enrich with fixture data for avatarUrl, teamId, workerId (not in JWT)
    const fixture = FIXTURE_SESSIONS[email.toLowerCase()]

    const session: Session = {
      userId: user.id,
      name: user.name,
      role: user.role as UserRole,
      operatorId: user.operatorId,
      accessToken,
      avatarUrl: fixture?.avatarUrl,
      teamId: fixture?.teamId,
      workerId: fixture?.workerId,
    }

    const cookieStore = await cookies()
    cookieStore.set(SESSION_COOKIE, JSON.stringify(session), {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })

    redirect(roleToRedirect(user.role as UserRole))
  } catch (err) {
    // redirect() throws internally — rethrow it
    if (err instanceof Error && err.message === 'NEXT_REDIRECT') throw err
    return { error: err instanceof Error ? err.message : 'Login failed. Please try again.' }
  }
}
