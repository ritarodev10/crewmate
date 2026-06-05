export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname.startsWith('/api/')) {
      const apiUrl = new URL(url.pathname.replace('/api', ''), env.API_URL)
      apiUrl.search = url.search

      const proxied = new Request(apiUrl.toString(), {
        method: request.method,
        headers: new Headers(request.headers),
        body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : null,
      })

      proxied.headers.set('x-cloudflare-secret', env.CLOUDFLARE_SECRET)

      return fetch(proxied)
    }

    return fetch(request)
  },
} satisfies ExportedHandler<Env>

interface Env {
  API_URL: string
  CLOUDFLARE_SECRET: string
}
