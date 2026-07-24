import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';
import { UserRole } from '../../common/enums';

@WebSocketGateway({
  namespace: '/notifications',
  cors: { origin: '*' },
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;
  private readonly logger = new Logger(NotificationsGateway.name);

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token;
      if (!token) throw new Error('No token provided');
      
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET || 'fallback_secret_change_me', // You should inject ConfigService instead if possible, but for simplicity here we read process.env
      });
      
      const userId = payload.sub;
      client.data.user = payload;
      
      // Join user-specific room
      client.join(`user_${userId}`);
      
      // Join role-specific room
      if (payload.role === UserRole.ADMIN) {
        client.join(`role_${UserRole.ADMIN}`);
      }
      
      this.logger.log(`Client connected: ${client.id} (user: ${userId})`);
    } catch (err) {
      this.logger.warn(`Connection rejected: ${client.id} - ${err.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  sendToUser(userId: string, event: string, data: any) {
    this.server.to(`user_${userId}`).emit(event, data);
  }

  sendToAdmins(event: string, data: any) {
    this.server.to(`role_${UserRole.ADMIN}`).emit(event, data);
  }
}
