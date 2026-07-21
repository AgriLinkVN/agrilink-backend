import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { NextFunction, Request, Response } from 'express';
import { Server } from 'http';
import * as request from 'supertest';

import { UserRole } from '../src/common/enums';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { AdminController } from '../src/modules/admin/admin.controller';
import { AdminService } from '../src/modules/admin/admin.service';
import { AdminReportService } from '../src/modules/admin/admin-report.service';

const STATE_AGENCY_ID = '11111111-1111-4111-8111-111111111111';
const FARMER_ID = '22222222-2222-4222-8222-222222222222';
const PRODUCT_ID = '33333333-3333-4333-8333-333333333333';

interface AuthenticatedRequest extends Request {
  user?: { sub: string; role: UserRole };
}

/**
 * Contract tests for the state-agency oversight endpoints added in P6:
 * GET /admin/products/violating, /admin/cooperatives-enterprises, and
 * /admin/reports/system.pdf. AdminService/AdminReportService are mocked —
 * database behavior (the sellerId -> seller join, real PDF bytes) was
 * exercised live against Postgres, see test/MANUAL_TESTING.md.
 */
describe('Admin state-agency oversight REST contract (e2e)', () => {
  let app: INestApplication;
  let server: Server;

  const adminService = {
    getStats: jest.fn(),
    getPendingProfiles: jest.fn(),
    verifyProfile: jest.fn(),
    getSystemConfigs: jest.fn(),
    updateSystemConfig: jest.fn(),
    getAuditLogs: jest.fn(),
    getDisputes: jest.fn(),
    updateDisputeStatus: jest.fn(),
    getPendingProducts: jest.fn(),
    getViolatingProducts: jest.fn(),
    getCooperativesAndEnterprises: jest.fn(),
  };

  const adminReportService = {
    generateSystemReportPdf: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        { provide: AdminService, useValue: adminService },
        { provide: AdminReportService, useValue: adminReportService },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use(testUserMiddleware);
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }),
    );
    app.useGlobalInterceptors(new ResponseInterceptor());
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
    server = app.getHttpServer() as Server;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  // ── RBAC baseline, shared by every route below ──────────────────────────

  describe('authorization', () => {
    it('rejects anonymous access (no role) and keeps the server alive', async () => {
      // Every admin route has an explicit @Roles(), so RolesGuard alone
      // (this harness) already rejects with 403. In production the global
      // JwtAuthGuard runs first and would 401 before RolesGuard is reached.
      await request(server).get('/admin/products/violating').expect(403);

      adminService.getStats.mockResolvedValue(makeStats());
      await request(server)
        .get('/admin/stats')
        .set('Authorization', 'Bearer token')
        .set('x-user-id', STATE_AGENCY_ID)
        .set('x-user-role', UserRole.STATE_AGENCY)
        .expect(200);
    });

    it('rejects a farmer (wrong role) with 403, not 500', async () => {
      await request(server)
        .get('/admin/products/violating')
        .set('Authorization', 'Bearer token')
        .set('x-user-id', FARMER_ID)
        .set('x-user-role', UserRole.FARMER)
        .expect(403);

      expect(adminService.getViolatingProducts).not.toHaveBeenCalled();
    });

    it('allows both admin and state_agency roles', async () => {
      adminService.getViolatingProducts.mockResolvedValue({ data: [], total: 0 });

      for (const role of [UserRole.ADMIN, UserRole.STATE_AGENCY]) {
        await request(server)
          .get('/admin/products/violating')
          .set('Authorization', 'Bearer token')
          .set('x-user-id', STATE_AGENCY_ID)
          .set('x-user-role', role)
          .expect(200);
      }
    });
  });

  // ── GET /admin/products/violating ───────────────────────────────────────

  describe('GET /admin/products/violating', () => {
    it('returns suspended/rejected products with the seller attached', async () => {
      adminService.getViolatingProducts.mockResolvedValue({
        data: [
          {
            id: PRODUCT_ID,
            name: 'Rau cai xanh',
            status: 'suspended',
            rejectionReason: 'Vi phạm chính sách chất lượng',
            updatedAt: '2026-07-01T00:00:00.000Z',
            seller: { fullName: 'Nguyen Van A' },
          },
        ],
        total: 1,
      });

      const res = await request(server)
        .get('/admin/products/violating')
        .set('Authorization', 'Bearer token')
        .set('x-user-id', STATE_AGENCY_ID)
        .set('x-user-role', UserRole.STATE_AGENCY)
        .expect(200);

      expect(res.body.data.total).toBe(1);
      expect(res.body.data.data[0].seller).toEqual({ fullName: 'Nguyen Van A' });
    });

    it('returns an empty list without erroring when nothing is violating', async () => {
      adminService.getViolatingProducts.mockResolvedValue({ data: [], total: 0 });

      const res = await request(server)
        .get('/admin/products/violating')
        .set('Authorization', 'Bearer token')
        .set('x-user-id', STATE_AGENCY_ID)
        .set('x-user-role', UserRole.STATE_AGENCY)
        .expect(200);

      expect(res.body.data).toEqual({ data: [], total: 0 });
    });

    it('surfaces a product with no resolvable seller as seller: null (not a crash)', async () => {
      adminService.getViolatingProducts.mockResolvedValue({
        data: [{ id: PRODUCT_ID, name: 'Orphaned product', status: 'rejected', seller: null }],
        total: 1,
      });

      const res = await request(server)
        .get('/admin/products/violating')
        .set('Authorization', 'Bearer token')
        .set('x-user-id', STATE_AGENCY_ID)
        .set('x-user-role', UserRole.STATE_AGENCY)
        .expect(200);

      expect(res.body.data.data[0].seller).toBeNull();
    });

    it('forwards pagination params', async () => {
      adminService.getViolatingProducts.mockResolvedValue({ data: [], total: 0 });

      await request(server)
        .get('/admin/products/violating')
        .query({ page: 2, limit: 10 })
        .set('Authorization', 'Bearer token')
        .set('x-user-id', STATE_AGENCY_ID)
        .set('x-user-role', UserRole.STATE_AGENCY)
        .expect(200);

      expect(adminService.getViolatingProducts).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2, limit: 10 }),
      );
    });
  });

  // ── GET /admin/products/pending ─────────────────────────────────────────

  describe('GET /admin/products/pending', () => {
    it('returns pending products with the seller attached', async () => {
      adminService.getPendingProducts.mockResolvedValue({
        data: [{ id: PRODUCT_ID, name: 'Xoai cat', status: 'pending_approval', seller: { fullName: 'Tran Thi B' } }],
        total: 1,
      });

      const res = await request(server)
        .get('/admin/products/pending')
        .set('Authorization', 'Bearer token')
        .set('x-user-id', STATE_AGENCY_ID)
        .set('x-user-role', UserRole.STATE_AGENCY)
        .expect(200);

      expect(res.body.data.data[0].seller.fullName).toBe('Tran Thi B');
    });
  });

  // ── GET /admin/cooperatives-enterprises ─────────────────────────────────

  describe('GET /admin/cooperatives-enterprises', () => {
    it('returns both cooperative and enterprise lists', async () => {
      adminService.getCooperativesAndEnterprises.mockResolvedValue({
        cooperatives: [{ id: 'c1', name: 'HTX Rau sach Da Lat', taxCode: '0312345678' }],
        enterprises: [{ id: 'e1', name: 'Cong ty XNK Nong san', taxCode: '0398765432' }],
      });

      const res = await request(server)
        .get('/admin/cooperatives-enterprises')
        .set('Authorization', 'Bearer token')
        .set('x-user-id', STATE_AGENCY_ID)
        .set('x-user-role', UserRole.STATE_AGENCY)
        .expect(200);

      expect(res.body.data.cooperatives).toHaveLength(1);
      expect(res.body.data.enterprises).toHaveLength(1);
    });

    it('returns empty arrays without erroring when there are none yet', async () => {
      adminService.getCooperativesAndEnterprises.mockResolvedValue({ cooperatives: [], enterprises: [] });

      const res = await request(server)
        .get('/admin/cooperatives-enterprises')
        .set('Authorization', 'Bearer token')
        .set('x-user-id', STATE_AGENCY_ID)
        .set('x-user-role', UserRole.STATE_AGENCY)
        .expect(200);

      expect(res.body.data).toEqual({ cooperatives: [], enterprises: [] });
    });
  });

  // ── GET /admin/audit-logs — opened to state_agency in P6 ────────────────

  describe('GET /admin/audit-logs', () => {
    it('is reachable by state_agency (previously admin-only)', async () => {
      adminService.getAuditLogs.mockResolvedValue({ data: [], total: 0 });

      await request(server)
        .get('/admin/audit-logs')
        .set('Authorization', 'Bearer token')
        .set('x-user-id', STATE_AGENCY_ID)
        .set('x-user-role', UserRole.STATE_AGENCY)
        .expect(200);
    });

    it('still rejects a buyer role with 403', async () => {
      await request(server)
        .get('/admin/audit-logs')
        .set('Authorization', 'Bearer token')
        .set('x-user-id', FARMER_ID)
        .set('x-user-role', UserRole.BUYER)
        .expect(403);
    });
  });

  // ── GET /admin/reports/system.pdf ───────────────────────────────────────

  describe('GET /admin/reports/system.pdf', () => {
    it('streams a PDF with the correct content type', async () => {
      adminReportService.generateSystemReportPdf.mockResolvedValue(Buffer.from('%PDF-1.3 fake'));

      const res = await request(server)
        .get('/admin/reports/system.pdf')
        .set('Authorization', 'Bearer token')
        .set('x-user-id', STATE_AGENCY_ID)
        .set('x-user-role', UserRole.STATE_AGENCY)
        .expect(200);

      expect(res.headers['content-type']).toBe('application/pdf');
      expect(res.headers['content-disposition']).toContain('attachment');
      expect(Buffer.from(res.body).toString().startsWith('%PDF')).toBe(true);
    });

    it('rejects an anonymous export attempt (no role) with 403', async () => {
      await request(server).get('/admin/reports/system.pdf').expect(403);
      expect(adminReportService.generateSystemReportPdf).not.toHaveBeenCalled();
    });

    it('propagates a report-generation failure as 500 without crashing the process', async () => {
      adminReportService.generateSystemReportPdf.mockRejectedValueOnce(new Error('pdfkit blew up'));

      await request(server)
        .get('/admin/reports/system.pdf')
        .set('Authorization', 'Bearer token')
        .set('x-user-id', STATE_AGENCY_ID)
        .set('x-user-role', UserRole.STATE_AGENCY)
        .expect(500);

      // Server must still answer the next request.
      adminService.getStats.mockResolvedValue(makeStats());
      await request(server)
        .get('/admin/stats')
        .set('Authorization', 'Bearer token')
        .set('x-user-id', STATE_AGENCY_ID)
        .set('x-user-role', UserRole.STATE_AGENCY)
        .expect(200);
    });
  });
});

function testUserMiddleware(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  if (req.headers.authorization) {
    req.user = {
      sub: headerValue(req, 'x-user-id') ?? STATE_AGENCY_ID,
      role: (headerValue(req, 'x-user-role') as UserRole) ?? UserRole.STATE_AGENCY,
    };
  }
  next();
}

function headerValue(req: Request, name: string): string | undefined {
  const value = req.headers[name];
  return Array.isArray(value) ? value[0] : value;
}

function makeStats() {
  return {
    totalUsers: 2,
    activeUsers: 0,
    pendingProfiles: { farmer: 0, cooperative: 0, enterprise: 0, supplier: 0, total: 0 },
    totalProducts: 0,
    pendingProducts: 0,
    openDisputes: 0,
    certificationsThisMonth: 0,
  };
}
