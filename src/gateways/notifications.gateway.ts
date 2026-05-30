import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger, forwardRef, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { ConfigService } from '@nestjs/config';
import { NotificationsService } from '../modules/notifications/notifications.service';
import { JwtPayload } from '../modules/auth/strategies/jwt.strategy';

@WebSocketGateway({
  namespace: '/notifications',
  cors: {
    origin: (origin: string, callback: (err: Error | null, allow?: boolean) => void) => {
      const allowed = (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
        .split(',')
        .map((o) => o.trim());
      const frontendUrl = process.env.FRONTEND_URL;
      if (frontendUrl && !allowed.includes(frontendUrl)) allowed.push(frontendUrl);

      // Allow no-origin (server-to-server / mobile clients) and whitelisted origins
      if (!origin || allowed.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`WebSocket CORS denied for origin: ${origin}`));
      }
    },
    credentials: true,
  },
})
export class NotificationsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly userSockets = new Map<string, Set<string>>();
  private readonly logger = new Logger('NotificationsGateway');

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService,
  ) {}

  afterInit(): void {
    this.logger.log('NotificationsGateway initialized on namespace /notifications');
  }

  handleConnection(client: Socket): void {
    const token =
      (client.handshake.auth?.token as string) ||
      (client.handshake.query?.token as string);

    if (!token) {
      this.logger.warn(`No token provided — disconnecting ${client.id}`);
      client.disconnect(true);
      return;
    }

    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(token, {
        secret: this.configService.get<string>('JWT_SECRET', 'fallback_secret_change_me'),
      });
    } catch {
      this.logger.warn(`Invalid token — disconnecting ${client.id}`);
      client.disconnect(true);
      return;
    }

    const userId = payload.sub;
    client.data.userId = userId;

    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(client.id);

    void client.join(`user_${userId}`);
    this.logger.log(`User ${userId} connected: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    const userId = client.data?.userId as string | undefined;
    if (userId) {
      const sockets = this.userSockets.get(userId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.userSockets.delete(userId);
        }
      }
    }
    this.logger.log(`Socket ${client.id} disconnected`);
  }

  emitToUser(userId: string, event: string, data: unknown): void {
    this.server.to(`user_${userId}`).emit(event, data);
    this.logger.debug(`Emit [${event}] → user ${userId}`);
  }

  isOnline(userId: string): boolean {
    return this.userSockets.has(userId);
  }

  @SubscribeMessage('mark_read')
  async handleMarkRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { notificationId: string },
  ): Promise<{ event: string; data: { id: string } }> {
    const userId = client.data?.userId as string;
    if (userId && payload?.notificationId) {
      // Delegate to service — keeps business logic single-sourced
      await this.notificationsService.markOneRead(payload.notificationId, userId);
    }
    return { event: 'marked_read', data: { id: payload.notificationId } };
  }

  @SubscribeMessage('ping')
  handlePing(): { event: string; data: string } {
    return { event: 'pong', data: 'pong' };
  }
}
