export async function browserFetch<T>(path: string): Promise<T> {
  const res = await fetch(`/api/proxy${path}`)
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json() as Promise<T>
}
