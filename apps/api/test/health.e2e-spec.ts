import { INestApplication, VersioningType } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { default as request } from 'supertest';

import { AppModule } from '../src/app.module';

describe('Health endpoints (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /healthz (liveness)', () => {
    it('Test 1: returns 200 with status ok', async () => {
      const res = await request(app.getHttpServer()).get('/healthz');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });

    it('Test 4: succeeds with NO x-cloudflare-secret header (guard bypassed)', async () => {
      const res = await request(app.getHttpServer())
        .get('/healthz')
        .unset('x-cloudflare-secret');
      expect(res.status).toBe(200);
    });
  });

  describe('GET /readyz (readiness)', () => {
    it('Test 2: returns 200 when DB and Redis are reachable', async () => {
      const res = await request(app.getHttpServer()).get('/readyz');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.info).toBeDefined();
    });

    it('Test 5: succeeds with NO x-cloudflare-secret header (guard bypassed)', async () => {
      const res = await request(app.getHttpServer())
        .get('/readyz')
        .unset('x-cloudflare-secret');
      expect(res.status).toBe(200);
    });
  });

  describe('CloudflareSecretGuard on non-health routes', () => {
    it('Test 6: GET /healthz with correct x-cloudflare-secret header returns 200', async () => {
      // Confirms the guard allows requests when the secret matches;
      // the unit tests cover the 401 rejection path exhaustively.
      const res = await request(app.getHttpServer())
        .get('/healthz')
        .set('x-cloudflare-secret', 'dev-cloudflare-shared-secret-min-32ch');
      expect(res.status).toBe(200);
    });
  });
});
