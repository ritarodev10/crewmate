// All API calls are server-side: Server Components, Server Actions, Route Handlers
const API_URL = process.env['API_URL'] ?? 'https://api.crewmate.ritaro.dev/api/v1'
const CF_SECRET = process.env['CLOUDFLARE_SECRET'] ?? ''

export async function apiFetch<T>(
  path: string,
  options: { token?: string; method?: string; body?: unknown } = {},
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      'x-cloudflare-secret': CF_SECRET,
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
    // Disable Next.js data cache for API calls — always fresh
    cache: 'no-store',
  })

  if (!res.ok) {
    const json: unknown = await res.json().catch(() => null)
    const message = (json as { error?: { message?: string } } | null)?.error?.message ?? `API error ${res.status}`
    throw new Error(message)
  }

  return res.json() as Promise<T>
}
