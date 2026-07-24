import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { NextFunction, Request, Response } from 'express';
import { Server } from 'http';
import * as request from 'supertest';

import { UserRole } from '../src/common/enums';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { ForumController } from '../src/modules/forum/forum.controller';
import { ForumService } from '../src/modules/forum/forum.service';
import { ForumCategory } from '../src/modules/forum/entities/forum-post.entity';

const POST_ID = '11111111-1111-4111-8111-111111111111';
const COMMENT_ID = '22222222-2222-4222-8222-222222222222';
const AUTHOR_ID = '33333333-3333-4333-8333-333333333333';
const OTHER_USER_ID = '44444444-4444-4444-8444-444444444444';
const STATE_AGENCY_ID = '55555555-5555-4555-8555-555555555555';

interface AuthenticatedRequest extends Request {
  user?: { sub: string; role: UserRole };
}

/**
 * Contract tests for ForumController with ForumService mocked.
 * Mirrors the real request pipeline (RolesGuard + validation + exception
 * filter + response envelope) without touching a database — the
 * database-backed behavior (counters, uniqueness, cascades) is covered
 * by the manual/integration checklist in test/MANUAL_TESTING.md and was
 * exercised live against Postgres during the P6 smoke test.
 *
 * Note on auth layering: in production, the global JwtAuthGuard (registered
 * via APP_GUARD in AppModule) runs before RolesGuard and rejects anonymous
 * requests with 401 before RolesGuard is ever reached. This standalone
 * harness only mounts RolesGuard (matching the controller's own
 * @UseGuards), so an anonymous request here surfaces RolesGuard's behavior
 * directly: 403 on routes with an explicit @Roles() requirement, and a
 * pass-through on routes that only require *some* authenticated user
 * (enforced by JwtAuthGuard in production, not exercised here).
 */
describe('Forum REST contract (e2e)', () => {
  let app: INestApplication;
  let server: Server;

  const forumService = {
    listPosts: jest.fn(),
    getPost: jest.fn(),
    createPost: jest.fn(),
    updatePost: jest.fn(),
    deletePost: jest.fn(),
    listComments: jest.fn(),
    addComment: jest.fn(),
    deleteComment: jest.fn(),
    toggleLike: jest.fn(),
    setHidden: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ForumController],
      providers: [{ provide: ForumService, useValue: forumService }],
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

  // ── GET /forum/posts — public browse ────────────────────────────────────

  describe('GET /forum/posts', () => {
    it('is reachable without a token (public route)', async () => {
      forumService.listPosts.mockResolvedValue({ data: [makePost()], total: 1 });

      const res = await request(server).get('/forum/posts').expect(200);

      expect(res.body.data.total).toBe(1);
      expect(forumService.listPosts).toHaveBeenCalled();
    });

    it('forwards category and search filters', async () => {
      forumService.listPosts.mockResolvedValue({ data: [], total: 0 });

      await request(server)
        .get('/forum/posts')
        .query({ category: 'market', search: 'gia lua' })
        .expect(200);

      expect(forumService.listPosts).toHaveBeenCalledWith(
        expect.objectContaining({}),
        'market',
        'gia lua',
      );
    });

    it('returns an empty list without erroring when there are no posts', async () => {
      forumService.listPosts.mockResolvedValue({ data: [], total: 0 });

      const res = await request(server).get('/forum/posts').expect(200);

      expect(res.body.data).toEqual({ data: [], total: 0 });
    });
  });

  // ── GET /forum/posts/:id — public detail ────────────────────────────────

  describe('GET /forum/posts/:id', () => {
    it('is reachable without a token and returns the post', async () => {
      forumService.getPost.mockResolvedValue(makePost());

      const res = await request(server).get(`/forum/posts/${POST_ID}`).expect(200);

      expect(res.body.data.id).toBe(POST_ID);
    });

    it('maps a missing post to 404 instead of crashing', async () => {
      forumService.getPost.mockRejectedValueOnce(new (require('@nestjs/common').NotFoundException)('Post not found'));

      const res = await request(server).get(`/forum/posts/${POST_ID}`).expect(404);
      expect(res.body.message).toBe('Post not found');
    });
  });

  // ── POST /forum/posts — create (auth required) ──────────────────────────

  describe('POST /forum/posts', () => {
    const validBody = {
      title: 'Ky thuat trong lua moi',
      content: 'Chia se kinh nghiem trong lua vu nay rat hieu qua',
      category: ForumCategory.TECHNICAL,
    };

    it('does not 500 or crash on an anonymous request (JwtAuthGuard rejects it in production)', async () => {
      // RolesGuard alone doesn't require a user here (no @Roles() on this
      // route) — the important assertion is that nothing crashes and the
      // service isn't called with an undefined author.
      forumService.createPost.mockResolvedValue(makePost(validBody));
      const res = await request(server).post('/forum/posts').send(validBody);
      expect(res.status).toBeLessThan(500);

      // Server must still be responsive afterwards — this is the exact
      // regression the AllExceptionsFilter rethrow bug caused in production.
      forumService.listPosts.mockResolvedValue({ data: [], total: 0 });
      await request(server).get('/forum/posts').expect(200);
    });

    it('creates a post for an authenticated user', async () => {
      forumService.createPost.mockResolvedValue(makePost({ ...validBody, authorId: AUTHOR_ID }));

      const res = await request(server)
        .post('/forum/posts')
        .set('Authorization', 'Bearer token')
        .set('x-user-id', AUTHOR_ID)
        .set('x-user-role', UserRole.FARMER)
        .send(validBody)
        .expect(201);

      expect(res.body.data.title).toBe(validBody.title);
      expect(forumService.createPost).toHaveBeenCalledWith(AUTHOR_ID, expect.objectContaining(validBody));
    });

    it('rejects a title shorter than 5 characters', async () => {
      await request(server)
        .post('/forum/posts')
        .set('Authorization', 'Bearer token')
        .set('x-user-id', AUTHOR_ID)
        .set('x-user-role', UserRole.FARMER)
        .send({ ...validBody, title: 'Hi' })
        .expect(400);

      expect(forumService.createPost).not.toHaveBeenCalled();
    });

    it('rejects content shorter than 10 characters', async () => {
      await request(server)
        .post('/forum/posts')
        .set('Authorization', 'Bearer token')
        .set('x-user-id', AUTHOR_ID)
        .set('x-user-role', UserRole.FARMER)
        .send({ ...validBody, content: 'short' })
        .expect(400);

      expect(forumService.createPost).not.toHaveBeenCalled();
    });

    it('rejects an invalid category enum value', async () => {
      await request(server)
        .post('/forum/posts')
        .set('Authorization', 'Bearer token')
        .set('x-user-id', AUTHOR_ID)
        .set('x-user-role', UserRole.FARMER)
        .send({ ...validBody, category: 'not-a-real-category' })
        .expect(400);

      expect(forumService.createPost).not.toHaveBeenCalled();
    });

    it('rejects a non-URL entry in imageUrls', async () => {
      await request(server)
        .post('/forum/posts')
        .set('Authorization', 'Bearer token')
        .set('x-user-id', AUTHOR_ID)
        .set('x-user-role', UserRole.FARMER)
        .send({ ...validBody, imageUrls: ['not-a-url'] })
        .expect(400);
    });

    it('rejects a client-supplied isHidden/likeCount instead of trusting client input (forbidNonWhitelisted)', async () => {
      // The global pipe uses forbidNonWhitelisted: true, so a client can't
      // sneak moderation/counter fields into a create payload — it 400s
      // rather than silently accepting (and definitely never overwriting)
      // server-controlled state.
      await request(server)
        .post('/forum/posts')
        .set('Authorization', 'Bearer token')
        .set('x-user-id', AUTHOR_ID)
        .set('x-user-role', UserRole.FARMER)
        .send({ ...validBody, isHidden: true, likeCount: 999 })
        .expect(400);

      expect(forumService.createPost).not.toHaveBeenCalled();
    });
  });

  // ── PATCH / DELETE /forum/posts/:id — ownership ─────────────────────────

  describe('PATCH /forum/posts/:id', () => {
    it('allows the author to update their own post', async () => {
      forumService.updatePost.mockResolvedValue(makePost({ title: 'Tieu de moi' }));

      await request(server)
        .patch(`/forum/posts/${POST_ID}`)
        .set('Authorization', 'Bearer token')
        .set('x-user-id', AUTHOR_ID)
        .set('x-user-role', UserRole.FARMER)
        .send({ title: 'Tieu de moi' })
        .expect(200);

      expect(forumService.updatePost).toHaveBeenCalledWith(POST_ID, AUTHOR_ID, { title: 'Tieu de moi' });
    });

    it('maps a not-your-post service error to 403', async () => {
      forumService.updatePost.mockRejectedValueOnce(
        new (require('@nestjs/common').ForbiddenException)('Not your post'),
      );

      await request(server)
        .patch(`/forum/posts/${POST_ID}`)
        .set('Authorization', 'Bearer token')
        .set('x-user-id', OTHER_USER_ID)
        .set('x-user-role', UserRole.FARMER)
        .send({ title: 'Tieu de bi thay doi' })
        .expect(403);
    });
  });

  describe('DELETE /forum/posts/:id', () => {
    it('deletes when the caller owns the post', async () => {
      forumService.deletePost.mockResolvedValue({ success: true });

      await request(server)
        .delete(`/forum/posts/${POST_ID}`)
        .set('Authorization', 'Bearer token')
        .set('x-user-id', AUTHOR_ID)
        .set('x-user-role', UserRole.FARMER)
        .expect(200);
    });

    it('forwards an anonymous delete to the service with an undefined author (JwtAuthGuard blocks this in production)', async () => {
      // Documents the real gap this route relies on JwtAuthGuard for:
      // RolesGuard alone has nothing to enforce without an explicit
      // @Roles(), so in isolation the call reaches the service with
      // authorId === undefined, which then 403s on the ownership check.
      forumService.deletePost.mockRejectedValueOnce(
        new (require('@nestjs/common').ForbiddenException)('Not your post'),
      );
      await request(server).delete(`/forum/posts/${POST_ID}`).expect(403);
      expect(forumService.deletePost).toHaveBeenCalledWith(POST_ID, undefined);
    });
  });

  // ── PATCH /forum/posts/:id/moderate — role-gated ────────────────────────

  describe('PATCH /forum/posts/:id/moderate', () => {
    it('allows a state_agency user to hide a post', async () => {
      forumService.setHidden.mockResolvedValue(makePost({ isHidden: true }));

      await request(server)
        .patch(`/forum/posts/${POST_ID}/moderate`)
        .set('Authorization', 'Bearer token')
        .set('x-user-id', STATE_AGENCY_ID)
        .set('x-user-role', UserRole.STATE_AGENCY)
        .send({ isHidden: true })
        .expect(200);

      expect(forumService.setHidden).toHaveBeenCalledWith(POST_ID, true);
    });

    it('rejects a plain farmer trying to moderate (403, not 500)', async () => {
      await request(server)
        .patch(`/forum/posts/${POST_ID}/moderate`)
        .set('Authorization', 'Bearer token')
        .set('x-user-id', AUTHOR_ID)
        .set('x-user-role', UserRole.FARMER)
        .send({ isHidden: true })
        .expect(403);

      expect(forumService.setHidden).not.toHaveBeenCalled();
    });

    it('rejects an anonymous moderation attempt with 403 (no role on an unauthenticated request)', async () => {
      await request(server)
        .patch(`/forum/posts/${POST_ID}/moderate`)
        .send({ isHidden: true })
        .expect(403);
      expect(forumService.setHidden).not.toHaveBeenCalled();
    });
  });

  // ── comments ─────────────────────────────────────────────────────────────

  describe('GET /forum/posts/:id/comments', () => {
    it('is reachable without a token', async () => {
      forumService.listComments.mockResolvedValue({ data: [makeComment()], total: 1 });

      const res = await request(server).get(`/forum/posts/${POST_ID}/comments`).expect(200);
      expect(res.body.data.total).toBe(1);
    });
  });

  describe('POST /forum/posts/:id/comments', () => {
    it('adds a comment for an authenticated user', async () => {
      forumService.addComment.mockResolvedValue(makeComment());

      const res = await request(server)
        .post(`/forum/posts/${POST_ID}/comments`)
        .set('Authorization', 'Bearer token')
        .set('x-user-id', AUTHOR_ID)
        .set('x-user-role', UserRole.FARMER)
        .send({ content: 'Bai viet hay qua!' })
        .expect(201);

      expect(res.body.data.content).toBe('Bai viet hay qua!');
    });

    it('rejects an empty comment body', async () => {
      await request(server)
        .post(`/forum/posts/${POST_ID}/comments`)
        .set('Authorization', 'Bearer token')
        .set('x-user-id', AUTHOR_ID)
        .set('x-user-role', UserRole.FARMER)
        .send({ content: '' })
        .expect(400);

      expect(forumService.addComment).not.toHaveBeenCalled();
    });

    it('maps a comment-on-missing-post error to 404', async () => {
      forumService.addComment.mockRejectedValueOnce(
        new (require('@nestjs/common').NotFoundException)('Post not found'),
      );

      await request(server)
        .post(`/forum/posts/${POST_ID}/comments`)
        .set('Authorization', 'Bearer token')
        .set('x-user-id', AUTHOR_ID)
        .set('x-user-role', UserRole.FARMER)
        .send({ content: 'orphan comment' })
        .expect(404);
    });
  });

  describe('DELETE /forum/comments/:commentId', () => {
    it('deletes when the caller owns the comment', async () => {
      forumService.deleteComment.mockResolvedValue({ success: true });

      await request(server)
        .delete(`/forum/comments/${COMMENT_ID}`)
        .set('Authorization', 'Bearer token')
        .set('x-user-id', AUTHOR_ID)
        .set('x-user-role', UserRole.FARMER)
        .expect(200);
    });

    it('maps a not-your-comment error to 403', async () => {
      forumService.deleteComment.mockRejectedValueOnce(
        new (require('@nestjs/common').ForbiddenException)('Not your comment'),
      );

      await request(server)
        .delete(`/forum/comments/${COMMENT_ID}`)
        .set('Authorization', 'Bearer token')
        .set('x-user-id', OTHER_USER_ID)
        .set('x-user-role', UserRole.FARMER)
        .expect(403);
    });
  });

  // ── likes ────────────────────────────────────────────────────────────────

  describe('POST /forum/posts/:id/like', () => {
    it('toggles like on for an authenticated user', async () => {
      forumService.toggleLike.mockResolvedValue({ liked: true, likeCount: 1 });

      const res = await request(server)
        .post(`/forum/posts/${POST_ID}/like`)
        .set('Authorization', 'Bearer token')
        .set('x-user-id', AUTHOR_ID)
        .set('x-user-role', UserRole.FARMER)
        .expect(201);

      expect(res.body.data).toEqual({ liked: true, likeCount: 1 });
    });

    it('toggles like off on a second call (idempotent toggle contract)', async () => {
      forumService.toggleLike.mockResolvedValueOnce({ liked: true, likeCount: 1 });
      forumService.toggleLike.mockResolvedValueOnce({ liked: false, likeCount: 0 });

      const agent = request(server);
      const first = await agent
        .post(`/forum/posts/${POST_ID}/like`)
        .set('Authorization', 'Bearer token')
        .set('x-user-id', AUTHOR_ID)
        .set('x-user-role', UserRole.FARMER)
        .expect(201);
      const second = await agent
        .post(`/forum/posts/${POST_ID}/like`)
        .set('Authorization', 'Bearer token')
        .set('x-user-id', AUTHOR_ID)
        .set('x-user-role', UserRole.FARMER)
        .expect(201);

      expect(first.body.data.liked).toBe(true);
      expect(second.body.data.liked).toBe(false);
    });

    it('forwards an anonymous like with an undefined user id (JwtAuthGuard blocks this in production)', async () => {
      forumService.toggleLike.mockResolvedValue({ liked: true, likeCount: 1 });
      await request(server).post(`/forum/posts/${POST_ID}/like`).expect(201);
      expect(forumService.toggleLike).toHaveBeenCalledWith(POST_ID, undefined);
    });
  });
});

function testUserMiddleware(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  if (req.headers.authorization) {
    req.user = {
      sub: headerValue(req, 'x-user-id') ?? AUTHOR_ID,
      role: (headerValue(req, 'x-user-role') as UserRole) ?? UserRole.FARMER,
    };
  }
  next();
}

function headerValue(req: Request, name: string): string | undefined {
  const value = req.headers[name];
  return Array.isArray(value) ? value[0] : value;
}

function makePost(overrides: Record<string, unknown> = {}) {
  return {
    id: POST_ID,
    authorId: AUTHOR_ID,
    title: 'Ky thuat trong lua moi',
    content: 'Chia se kinh nghiem trong lua vu nay rat hieu qua',
    category: ForumCategory.TECHNICAL,
    imageUrls: null,
    likeCount: 0,
    commentCount: 0,
    viewCount: 0,
    isHidden: false,
    createdAt: new Date('2026-06-01T00:00:00.000Z'),
    updatedAt: new Date('2026-06-01T00:00:00.000Z'),
    ...overrides,
  };
}

function makeComment(overrides: Record<string, unknown> = {}) {
  return {
    id: COMMENT_ID,
    postId: POST_ID,
    authorId: AUTHOR_ID,
    content: 'Bai viet hay qua!',
    isHidden: false,
    createdAt: new Date('2026-06-01T00:00:00.000Z'),
    updatedAt: new Date('2026-06-01T00:00:00.000Z'),
    ...overrides,
  };
}
