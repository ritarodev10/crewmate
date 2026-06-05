'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { SESSION_COOKIE, DEMO_ACTOR_COOKIE } from '@web/lib/session'

export async function logoutAction() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
  cookieStore.delete(DEMO_ACTOR_COOKIE)
  redirect('/login')
}
