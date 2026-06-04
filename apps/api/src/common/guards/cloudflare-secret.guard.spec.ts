import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { CloudflareSecretGuard } from './cloudflare-secret.guard';

const KNOWN_SECRET = 'test-cloudflare-shared-secret-at-least-32ch';

function buildContext(path: string, secret?: string): ExecutionContext {
  const req = {
    path,
    header: (name: string) => (name === 'x-cloudflare-secret' ? secret : undefined),
  };
  return {
    switchToHttp: () => ({
      getRequest: () => req,
    }),
  } as unknown as ExecutionContext;
}

describe('CloudflareSecretGuard', () => {
  let guard: CloudflareSecretGuard;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CloudflareSecretGuard,
        {
          provide: ConfigService,
          useValue: {
            get: (_key: string) => KNOWN_SECRET,
          },
        },
      ],
    }).compile();

    guard = module.get<CloudflareSecretGuard>(CloudflareSecretGuard);
  });

  it('Test 1: returns true when x-cloudflare-secret header matches config value', () => {
    const ctx = buildContext('/v1/some-route', KNOWN_SECRET);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('Test 2: throws UnauthorizedException when x-cloudflare-secret header is missing', () => {
    const ctx = buildContext('/v1/some-route', undefined);
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('Test 3: throws UnauthorizedException when x-cloudflare-secret header is wrong', () => {
    const ctx = buildContext('/v1/some-route', 'wrong-secret-value-here-padded');
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('Test 4: returns true (bypasses) for GET /healthz with NO secret header', () => {
    const ctx = buildContext('/healthz', undefined);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('Test 5: returns true (bypasses) for GET /readyz with NO secret header', () => {
    const ctx = buildContext('/readyz', undefined);
    expect(guard.canActivate(ctx)).toBe(true);
  });
});
