// Minimal Cloudflare Workers global type declarations.
// The full @cloudflare/workers-types package is added in Phase 2 when
// wrangler generate-types is run to produce the actual bindings.

declare class ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

interface Fetcher {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

interface ExportedHandler<Env = Record<string, unknown>> {
  fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> | Response;
}
