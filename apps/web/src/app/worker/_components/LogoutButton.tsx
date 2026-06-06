'use client'

import { useRouter } from 'next/navigation'
import { SESSION_COOKIE, DEMO_ACTOR_COOKIE } from '@web/lib/session'

export function LogoutButton() {
  const router = useRouter()

  function handleLogout() {
    // Clear both cookies by setting expired date
    document.cookie = `${SESSION_COOKIE}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
    document.cookie = `${DEMO_ACTOR_COOKIE}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
    router.push('/login')
  }

  return (
    <button
      onClick={handleLogout}
      className="text-xs text-white/70 hover:text-white transition-colors underline-offset-2 hover:underline"
    >
      Logout
    </button>
  )
}
