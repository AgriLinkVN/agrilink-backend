import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { Notification } from './entities/notification.entity';
import { NotificationRealtimePublisherPort } from './domain/ports/notification-realtime-publisher.port';

@WebSocketGateway({
  namespace: '/notifications',
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') ?? ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003', 'http://localhost:4000'],
    credentials: true,
  },
})
export class NotificationsGateway
  implements OnGatewayConnection, NotificationRealtimePublisherPort
{
  @WebSocketServer()
  private server: Server;

  constructor(private readonly jwtService: JwtService) {}

  handleConnection(client: Socket) {
    const token = this.extractToken(client);
    if (!token) {
      client.disconnect(true);
      return;
    }

    try {
      const payload = this.jwtService.verify<{ sub: string }>(token);
      if (!payload.sub) {
        client.disconnect(true);
        return;
      }

      client.data.userId = payload.sub;
      client.join(this.userRoom(payload.sub));
    } catch {
      client.disconnect(true);
    }
  }

  publishCreated(userId: string, notification: Notification): void {
    this.emitToUser(userId, 'new_notification', notification);
  }

  publishRead(userId: string, notificationId: string): void {
    this.emitToUser(userId, 'marked_read', { id: notificationId });
  }

  publishAllRead(userId: string): void {
    this.emitToUser(userId, 'all_notifications_read', {});
  }

  emitToUser(userId: string, event: string, payload: unknown): void {
    if (!this.server) return;
    this.server.to(this.userRoom(userId)).emit(event, payload);
  }

  private userRoom(userId: string) {
    return `user:${userId}`;
  }

  private extractToken(client: Socket): string | null {
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken.trim()) {
      return authToken.replace(/^Bearer\s+/i, '');
    }

    const header = client.handshake.headers.authorization;
    if (typeof header === 'string' && header.startsWith('Bearer ')) {
      return header.slice(7);
    }

    return null;
  }
}
