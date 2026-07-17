import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { NotificationRealtimePublisherPort } from '../../domain/ports/notification-realtime-publisher.port';
import {
  AllNotificationsReadPayload,
  NotificationMarkedReadPayload,
  NotificationModel,
} from '../../domain/notification.types';
import {
  NOTIFICATION_SOCKET_EVENTS,
  NewNotificationEvent,
  NotificationMarkedReadEvent,
  AllNotificationsReadEvent,
} from '../contracts/notification-socket.events';
import {
  toAllNotificationsReadEvent,
  toNotificationMarkedReadEvent,
  toNotificationResponse,
} from '../mappers/notification-response.mapper';

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

  publishCreated(userId: string, notification: NotificationModel): void {
    this.emitToUser<NewNotificationEvent>(
      userId,
      NOTIFICATION_SOCKET_EVENTS.NEW,
      toNotificationResponse(notification),
    );
  }

  publishMarkedRead(
    userId: string,
    payload: NotificationMarkedReadPayload,
  ): void {
    this.emitToUser<NotificationMarkedReadEvent>(
      userId,
      NOTIFICATION_SOCKET_EVENTS.MARKED_READ,
      toNotificationMarkedReadEvent(payload),
    );
  }

  publishAllRead(userId: string, payload: AllNotificationsReadPayload): void {
    this.emitToUser<AllNotificationsReadEvent>(
      userId,
      NOTIFICATION_SOCKET_EVENTS.ALL_READ,
      toAllNotificationsReadEvent(payload),
    );
  }

  private emitToUser<TPayload>(
    userId: string,
    event: string,
    payload: TPayload,
  ): void {
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
