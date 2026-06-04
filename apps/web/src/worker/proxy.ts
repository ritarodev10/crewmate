// @ts-expect-error -- generated at opennextjs-cloudflare build time; not present in dev
import openNextHandler from '../../.open-next/worker.js';

interface Env {
  BACKEND_ORIGIN: string;
  CLOUDFLARE_SHARED_SECRET: string;
  ASSETS: Fetcher;
}

const DIRECT_PREFIXES = ['/v1/', '/graphql', '/ws'];

function isApiProxy(pathname: string): boolean {
  return pathname === '/api' || pathname.startsWith('/api/');
}

function isDirectProxy(pathname: string): boolean {
  return DIRECT_PREFIXES.some((p) =>
    p.endsWith('/') ? pathname.startsWith(p) : pathname === p || pathname.startsWith(p + '/'),
  );
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;

    if (isApiProxy(pathname)) {
      // Strip /api prefix before forwarding to origin
      // /api/healthz → /healthz, /api/v1/jobs → /v1/jobs
      const originPath = pathname.slice('/api'.length) || '/';
      const target = new URL(originPath + url.search, env.BACKEND_ORIGIN);
      const headers = new Headers(request.headers);
      headers.set('x-cloudflare-secret', env.CLOUDFLARE_SHARED_SECRET);

      if (request.headers.get('Upgrade') === 'websocket') {
        return fetch(target.toString(), request);
      }
      return fetch(target.toString(), new Request(target.toString(), { ...request, headers }));
    }

    if (isDirectProxy(pathname)) {
      const target = new URL(pathname + url.search, env.BACKEND_ORIGIN);
      const headers = new Headers(request.headers);
      headers.set('x-cloudflare-secret', env.CLOUDFLARE_SHARED_SECRET);

      if (request.headers.get('Upgrade') === 'websocket') {
        return fetch(target.toString(), request);
      }
      return fetch(target.toString(), new Request(target.toString(), { ...request, headers }));
    }

    // Everything else → Next.js
    return openNextHandler.fetch(request, env, ctx);
  },
} satisfies ExportedHandler<Env>;
