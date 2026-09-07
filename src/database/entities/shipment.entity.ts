import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ShipmentStatus } from '../../common/enums';

@Entity('shipments')
export class Shipment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'order_id', type: 'uuid', unique: true })
  orderId: string;

  @Column({ name: 'logistics_user_id', type: 'uuid', nullable: true })
  logisticsUserId: string | null;

  @Column({ name: 'tracking_code', length: 100, unique: true, nullable: true })
  trackingCode: string | null;

  @Column({ name: 'external_tracking_code', length: 100, nullable: true })
  externalTrackingCode: string | null;

  @Column({ type: 'enum', enum: ShipmentStatus, default: ShipmentStatus.WAITING_PICKUP })
  status: ShipmentStatus;

  @Column({ name: 'pickup_address', type: 'text', nullable: true })
  pickupAddress: string | null;

  @Column({ name: 'pickup_latitude', type: 'decimal', precision: 10, scale: 8, nullable: true })
  pickupLatitude: number | null;

  @Column({ name: 'pickup_longitude', type: 'decimal', precision: 11, scale: 8, nullable: true })
  pickupLongitude: number | null;

  @Column({ name: 'delivery_address', type: 'text', nullable: true })
  deliveryAddress: string | null;

  @Column({ name: 'weight_kg', type: 'decimal', precision: 8, scale: 2, nullable: true })
  weightKg: number | null;

  @Column({ name: 'pickup_confirmed_at', type: 'timestamptz', nullable: true })
  pickupConfirmedAt: Date | null;

  @Column({ name: 'delivered_at', type: 'timestamptz', nullable: true })
  deliveredAt: Date | null;

  @Column({ name: 'failed_at', type: 'timestamptz', nullable: true })
  failedAt: Date | null;

  @Column({ name: 'fail_reason', type: 'text', nullable: true })
  failReason: string | null;

  @Column({ name: 'proof_image_url', type: 'text', nullable: true })
  proofImageUrl: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
