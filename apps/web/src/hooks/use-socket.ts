'use client'

import { useEffect, useRef } from 'react'
import { io } from 'socket.io-client'

const SOCKET_EVENTS = [
  'job.status.changed',
  'job.progress.updated',
  'job.cancelled',
  'worker.status.changed',
] as const

export function useSocket(
  token: string | undefined,
  onEvent: (event: string, data: unknown) => void,
): void {
  const handlerRef = useRef(onEvent)
  handlerRef.current = onEvent

  useEffect(() => {
    if (!token) return

    const apiUrl = process.env['NEXT_PUBLIC_API_URL'] ?? ''
    const socket = io(`${apiUrl}/ws`, {
      transports: ['websocket'],
      auth: { token },
    })

    for (const event of SOCKET_EVENTS) {
      socket.on(event, (data: unknown) => {
        handlerRef.current(event, data)
      })
    }

    return () => {
      socket.disconnect()
    }
  }, [token])
}
