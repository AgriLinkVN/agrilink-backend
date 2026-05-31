import { Injectable, Logger, forwardRef, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationsGateway } from '../../gateways/notifications.gateway';
import { NotifType } from '../../common/enums';

/**
 * Central notification service.
 *
 * **Cross-team integration contract:**
 * Any module that owns an event the user must hear about should `imports:
 * [NotificationsModule]` and inject `NotificationsService`, then call one of
 * the typed helpers (`notifyProductApproved`, `notifyMemberRequest`, ...).
 *
 * Always catch errors from these helpers — a notification failure should
 * never break the originating business action.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notifRepo: Repository<Notification>,
    @Inject(forwardRef(() => NotificationsGateway))
    private readonly gateway: NotificationsGateway,
  ) {}

  // ── Core: persist + push ──────────────────────────────────────────────────

  /**
   * Persist a notification and push it to all of the user's open sockets.
   * Returns the saved entity so callers can correlate it with a deep link.
   */
  async createAndEmit(dto: CreateNotificationDto): Promise<Notification> {
    const notif = this.notifRepo.create({
      userId: dto.userId,
      type: dto.type,
      title: dto.title,
      body: dto.body ?? '',
      data: dto.data,
    });
    const saved = await this.notifRepo.save(notif);
    try {
      this.gateway.emitToUser(dto.userId, 'new_notification', saved);
    } catch (err) {
      // Gateway failure must not roll back the DB row
      this.logger.warn(`WebSocket emit failed for user ${dto.userId}: ${(err as Error).message}`);
    }
    return saved;
  }

  // ── Public typed helpers (for cross-team integration) ─────────────────────

  /** Called by P2 (products) when admin approves a product. */
  notifyProductApproved(
    sellerId: string,
    product: { id: string; name: string },
  ): Promise<Notification> {
    return this.createAndEmit({
      userId: sellerId,
      type: NotifType.product_approved,
      title: 'Sản phẩm đã được duyệt',
      body: `Sản phẩm "${product.name}" đã được phê duyệt và đang được hiển thị.`,
      data: { productId: product.id, link: `/marketplace/${product.id}` },
    });
  }

  /** Called by P2 (products) when admin rejects a product. */
  notifyProductRejected(
    sellerId: string,
    product: { id: string; name: string },
    reason: string,
  ): Promise<Notification> {
    return this.createAndEmit({
      userId: sellerId,
      type: NotifType.product_rejected,
      title: 'Sản phẩm bị từ chối',
      body: `Sản phẩm "${product.name}" bị từ chối: ${reason}`,
      data: { productId: product.id, reason },
    });
  }

  /** Called by P3 (cooperatives) when a farmer requests to join a cooperative. */
  notifyMemberRequest(
    cooperativeOwnerId: string,
    farmer: { id: string; fullName: string },
    cooperativeName?: string,
  ): Promise<Notification> {
    return this.createAndEmit({
      userId: cooperativeOwnerId,
      type: NotifType.member_request,
      title: 'Yêu cầu gia nhập HTX mới',
      body: cooperativeName
        ? `${farmer.fullName} muốn gia nhập "${cooperativeName}".`
        : `${farmer.fullName} muốn gia nhập HTX của bạn.`,
      data: { farmerId: farmer.id, link: `/dashboard/cooperative/members` },
    });
  }

  /** Called by P4 (market-prices) when price crosses a watched threshold. */
  notifyPriceAlert(
    userId: string,
    payload: { categoryName: string; provinceName: string; avgPrice: number; unit: string },
  ): Promise<Notification> {
    return this.createAndEmit({
      userId,
      type: NotifType.price_alert,
      title: `Giá ${payload.categoryName} thay đổi`,
      body: `Giá trung bình tại ${payload.provinceName}: ${payload.avgPrice.toLocaleString('vi-VN')}đ/${payload.unit}`,
      data: payload,
    });
  }

  /**
   * Generic future-proof entry for any new notification kind.
   * Prefer the typed helpers above when one exists.
   */
  notify(dto: CreateNotificationDto): Promise<Notification> {
    return this.createAndEmit(dto);
  }

  // ── Queries ────────────────────────────────────────────────────────────────

  async getAll(
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<{ data: Notification[]; total: number; page: number; limit: number }> {
    const safePage = Number(page) > 0 ? Number(page) : 1;
    const safeLimit = Number(limit) > 0 ? Math.min(Number(limit), 50) : 20;
    const [data, total] = await this.notifRepo.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
    });
    return { data, total, page: safePage, limit: safeLimit };
  }

  async getUnread(userId: string): Promise<Notification[]> {
    return this.notifRepo.find({
      where: { userId, isRead: false },
      order: { createdAt: 'DESC' },
      take: 20,
    });
  }

  async countUnread(userId: string): Promise<number> {
    return this.notifRepo.count({ where: { userId, isRead: false } });
  }

  // ── Mutations ─────────────────────────────────────────────────────────────

  async markOneRead(id: string, userId: string): Promise<void> {
    await this.notifRepo.update({ id, userId }, { isRead: true, readAt: new Date() });
  }

  async markAllRead(userId: string): Promise<void> {
    await this.notifRepo.update(
      { userId, isRead: false },
      { isRead: true, readAt: new Date() },
    );
  }
}
