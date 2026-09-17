import { Controller, Get, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Server } from 'http';
import * as request from 'supertest';
import {
  buildCorsOptions,
  parseCorsOrigins,
} from './http-security.config';

@Controller('cors-test')
class CorsTestController {
  @Get()
  get(): { ok: true } {
    return { ok: true };
  }
}

describe('HTTP CORS security configuration', () => {
  const allowedOrigin = 'https://frontend.example.com';
  let app: INestApplication;
  let server: Server;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [CorsTestController],
    }).compile();
    app = moduleRef.createNestApplication();
    app.enableCors(buildCorsOptions([allowedOrigin]));
    await app.init();
    server = app.getHttpServer() as Server;
  });

  afterAll(async () => {
    await app.close();
  });

  it('trims entries, removes empty values, and de-duplicates origins', () => {
    expect(
      parseCorsOrigins(
        ' https://frontend.example.com, ,http://localhost:3000,https://frontend.example.com ',
      ),
    ).toEqual([
      'https://frontend.example.com',
      'http://localhost:3000',
    ]);
  });

  it.each([
    '*',
    'https://frontend.example.com/',
    'https://frontend.example.com/path',
  ])('rejects an unsafe credentialed CORS origin: %s', (origin) => {
    expect(() => parseCorsOrigins(origin)).toThrow();
  });

  it('returns credentialed CORS headers for an allowed origin', async () => {
    const response = await request(server)
      .options('/cors-test')
      .set('Origin', allowedOrigin)
      .set('Access-Control-Request-Method', 'GET')
      .expect(204);

    expect(response.headers['access-control-allow-origin']).toBe(
      allowedOrigin,
    );
    expect(response.headers['access-control-allow-credentials']).toBe('true');
  });

  it('does not authorize an unknown origin', async () => {
    const response = await request(server)
      .options('/cors-test')
      .set('Origin', 'https://unknown.example.com')
      .set('Access-Control-Request-Method', 'GET')
      .expect(404);

    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });
});
