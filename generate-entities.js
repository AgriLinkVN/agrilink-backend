const fs = require('fs');
const path = require('path');

const entitiesDir = path.join(__dirname, 'src', 'database', 'entities');

if (!fs.existsSync(entitiesDir)) {
  fs.mkdirSync(entitiesDir, { recursive: true });
}

const entities = {
  'user.entity.ts': `export { User } from '../../modules/users/infrastructure/persistence/entities/user.entity';
`,
  'otp-verification.entity.ts': `export { OtpVerification } from '../../modules/auth/infrastructure/persistence/entities/otp-verification.entity';
`,
  'refresh-token.entity.ts': `export { RefreshToken } from '../../modules/auth/infrastructure/persistence/entities/refresh-token.entity';
`,
  'farmer-profile.entity.ts': `export { FarmerProfile } from '../../modules/profiles/infrastructure/persistence/entities/farmer-profile.entity';
`,

  'cooperative-profile.entity.ts': `export { CooperativeProfile } from '../../modules/profiles/infrastructure/persistence/entities/cooperative-profile.entity';
`,

  'enterprise-profile.entity.ts': `export { EnterpriseProfile } from '../../modules/profiles/infrastructure/persistence/entities/enterprise-profile.entity';
`,

  'supplier-profile.entity.ts': `export { SupplierProfile } from '../../modules/profiles/infrastructure/persistence/entities/supplier-profile.entity';
`,

  'logistics-profile.entity.ts': `import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('logistics_profiles')
export class LogisticsProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid', unique: true })
  userId: string;

  @Column({ name: 'company_name', length: 255 })
  companyName: string;

  @Column({ name: 'vehicle_types', type: 'text', array: true, default: [] })
  vehicleTypes: string[];

  @Column({ name: 'operating_provinces', type: 'int', array: true, default: [] })
  operatingProvinces: number[];

  @Column({ name: 'external_api_provider', length: 100, nullable: true })
  externalApiProvider: string | null;

  @Column({ name: 'external_api_key', type: 'text', nullable: true })
  externalApiKey: string | null;

  @Column({ name: 'is_verified', default: false })
  isVerified: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
`,
  'user-address.entity.ts': `export { UserAddress } from '../../modules/users/infrastructure/persistence/entities/user-address.entity';
`,
  'province.entity.ts': `export { Province } from '../../modules/geography/entities/province.entity';
`,
  'district.entity.ts': `export { District } from '../../modules/geography/entities/district.entity';
`,
  'product-category.entity.ts': `import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';

@Entity('product_categories')
export class ProductCategory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 100, unique: true })
  slug: string;

  @Column({ name: 'parent_id', type: 'int', nullable: true })
  parentId: number | null;

  @ManyToOne(() => ProductCategory, { nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent: ProductCategory | null;

  @Column({ name: 'icon_url', type: 'text', nullable: true })
  iconUrl: string | null;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;
}
`,
  'product.entity.ts': `import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { SellerType, FarmingType, ProductUnit, ProductStatus } from '../../common/enums';
import { User } from './user.entity';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'seller_id', type: 'uuid' })
  sellerId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'seller_id' })
  seller: User;

  @Column({ name: 'seller_type', type: 'enum', enum: SellerType })
  sellerType: SellerType;

  @Column({ name: 'category_id', type: 'int', nullable: true })
  categoryId: number | null;

  @Column({ length: 50, unique: true, nullable: true })
  sku: string | null;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ length: 100, nullable: true })
  variety: string | null;

  @Column({ name: 'farming_type', type: 'enum', enum: FarmingType })
  farmingType: FarmingType;

  @Column({ type: 'enum', enum: ProductUnit })
  unit: ProductUnit;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  price: number;

  @Column({ name: 'min_order_quantity', type: 'decimal', precision: 10, scale: 2, default: 1 })
  minOrderQuantity: number;

  @Column({ name: 'stock_quantity', type: 'decimal', precision: 10, scale: 2, default: 0 })
  stockQuantity: number;

  @Column({ name: 'province_id', type: 'int', nullable: true })
  provinceId: number | null;

  @Column({ name: 'district_id', type: 'int', nullable: true })
  districtId: number | null;

  @Column({ name: 'farm_latitude', type: 'decimal', precision: 10, scale: 8, nullable: true })
  farmLatitude: number | null;

  @Column({ name: 'farm_longitude', type: 'decimal', precision: 11, scale: 8, nullable: true })
  farmLongitude: number | null;

  @Column({ name: 'harvest_date', type: 'date', nullable: true })
  harvestDate: string | null;

  @Column({ type: 'enum', enum: ProductStatus, default: ProductStatus.DRAFT })
  status: ProductStatus;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string | null;

  @Column({ name: 'is_featured', default: false })
  isFeatured: boolean;

  @Column({ name: 'view_count', type: 'int', default: 0 })
  viewCount: number;

  @Column({ name: 'sold_count', type: 'decimal', precision: 10, scale: 2, default: 0 })
  soldCount: number;

  @Column({ name: 'avg_rating', type: 'decimal', precision: 3, scale: 2, default: 0 })
  avgRating: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
`,
  'product-image.entity.ts': `import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Product } from './product.entity';

@Entity('product_images')
export class ProductImage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ type: 'text' })
  url: string;

  @Column({ name: 'alt_text', length: 255, nullable: true })
  altText: string | null;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Column({ name: 'is_primary', default: false })
  isPrimary: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
`,
  'product-certification.entity.ts': `import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
import { CertType } from '../../common/enums';

@Entity('product_certifications')
export class ProductCertification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @Column({ name: 'cert_type', type: 'enum', enum: CertType })
  certType: CertType;

  @Column({ name: 'cert_number', length: 100, nullable: true })
  certNumber: string | null;

  @Column({ name: 'issued_by', length: 255, nullable: true })
  issuedBy: string | null;

  @Column({ name: 'issued_date', type: 'date', nullable: true })
  issuedDate: string | null;

  @Column({ name: 'expires_date', type: 'date', nullable: true })
  expiresDate: string | null;

  @Column({ name: 'document_url', type: 'text', nullable: true })
  documentUrl: string | null;

  @Column({ name: 'is_verified', default: false })
  isVerified: boolean;

  @Column({ name: 'verified_by', type: 'uuid', nullable: true })
  verifiedBy: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
`,
  'product-wishlist.entity.ts': `import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('product_wishlist')
export class ProductWishlist {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
`,
  'order.entity.ts': `import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { OrderStatus, PaymentMethod, PaymentStatus } from '../../common/enums';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'order_code', length: 30, unique: true })
  orderCode: string;

  @Column({ name: 'buyer_id', type: 'uuid' })
  buyerId: string;

  @Column({ name: 'seller_id', type: 'uuid' })
  sellerId: string;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  subtotal: number;

  @Column({ name: 'shipping_fee', type: 'decimal', precision: 15, scale: 2, default: 0 })
  shippingFee: number;

  @Column({ name: 'platform_fee', type: 'decimal', precision: 15, scale: 2, default: 0 })
  platformFee: number;

  @Column({ name: 'total_amount', type: 'decimal', precision: 15, scale: 2 })
  totalAmount: number;

  @Column({ name: 'payment_method', type: 'enum', enum: PaymentMethod, nullable: true })
  paymentMethod: PaymentMethod | null;

  @Column({ name: 'payment_status', type: 'enum', enum: PaymentStatus, default: PaymentStatus.UNPAID })
  paymentStatus: PaymentStatus;

  @Column({ name: 'shipping_address_id', type: 'uuid', nullable: true })
  shippingAddressId: string | null;

  @Column({ name: 'shipping_address_snapshot', type: 'jsonb', nullable: true })
  shippingAddressSnapshot: Record<string, any> | null;

  @Column({ name: 'logistics_id', type: 'uuid', nullable: true })
  logisticsId: string | null;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @Column({ name: 'cancelled_reason', type: 'text', nullable: true })
  cancelledReason: string | null;

  @Column({ name: 'confirmed_at', type: 'timestamptz', nullable: true })
  confirmedAt: Date | null;

  @Column({ name: 'shipped_at', type: 'timestamptz', nullable: true })
  shippedAt: Date | null;

  @Column({ name: 'delivered_at', type: 'timestamptz', nullable: true })
  deliveredAt: Date | null;

  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
`,
  'order-item.entity.ts': `import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Order } from './order.entity';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'order_id', type: 'uuid' })
  orderId: string;

  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ name: 'product_id', type: 'uuid', nullable: true })
  productId: string | null;

  @Column({ name: 'product_snapshot', type: 'jsonb' })
  productSnapshot: Record<string, any>;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  quantity: number;

  @Column({ name: 'unit_price', type: 'decimal', precision: 15, scale: 2 })
  unitPrice: number;

  @Column({ name: 'total_price', type: 'decimal', precision: 15, scale: 2 })
  totalPrice: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
`,
  'order-status-history.entity.ts': `import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
import { OrderStatus } from '../../common/enums';

@Entity('order_status_history')
export class OrderStatusHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'order_id', type: 'uuid' })
  orderId: string;

  @Column({ type: 'enum', enum: OrderStatus })
  status: OrderStatus;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @Column({ name: 'changed_by', type: 'uuid', nullable: true })
  changedBy: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
`,
  'payment.entity.ts': `import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
import { PaymentMethod, PaymentStatus } from '../../common/enums';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'order_id', type: 'uuid' })
  orderId: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number;

  @Column({ type: 'enum', enum: PaymentMethod })
  method: PaymentMethod;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.UNPAID })
  status: PaymentStatus;

  @Column({ name: 'external_txn_id', length: 255, nullable: true })
  externalTxnId: string | null;

  @Column({ name: 'payment_gateway', length: 50, nullable: true })
  paymentGateway: string | null;

  @Column({ name: 'gateway_response', type: 'jsonb', nullable: true })
  gatewayResponse: Record<string, any> | null;

  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true })
  paidAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
`,
  'shipment.entity.ts': `import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
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
`,
  'shipment-tracking-event.entity.ts': `import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
import { ShipmentStatus } from '../../common/enums';

@Entity('shipment_tracking_events')
export class ShipmentTrackingEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'shipment_id', type: 'uuid' })
  shipmentId: string;

  @Column({ type: 'enum', enum: ShipmentStatus })
  status: ShipmentStatus;

  @Column({ name: 'location_text', length: 255, nullable: true })
  locationText: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  latitude: number | null;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  longitude: number | null;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @Column({ name: 'recorded_by', type: 'uuid', nullable: true })
  recordedBy: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
`,
  'incident-report.entity.ts': `import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
import { IncidentType } from '../../common/enums';

@Entity('incident_reports')
export class IncidentReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'shipment_id', type: 'uuid' })
  shipmentId: string;

  @Column({ name: 'reported_by', type: 'uuid' })
  reportedBy: string;

  @Column({ name: 'incident_type', type: 'enum', enum: IncidentType })
  incidentType: IncidentType;

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'evidence_urls', type: 'text', array: true, default: [] })
  evidenceUrls: string[];

  @Column({ length: 50, default: 'open' })
  status: string;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
`,
  'cooperative-member.entity.ts': `import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
import { MemberStatus } from '../../common/enums';

@Entity('cooperative_members')
export class CooperativeMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'cooperative_id', type: 'uuid' })
  cooperativeId: string;

  @Column({ name: 'farmer_id', type: 'uuid' })
  farmerId: string;

  @Column({ type: 'enum', enum: MemberStatus, default: MemberStatus.PENDING })
  status: MemberStatus;

  @Column({ name: 'join_request_note', type: 'text', nullable: true })
  joinRequestNote: string | null;

  @Column({ name: 'approved_by', type: 'uuid', nullable: true })
  approvedBy: string | null;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt: Date | null;

  @Column({ name: 'rejected_reason', type: 'text', nullable: true })
  rejectedReason: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
`,
  'bulk-listing.entity.ts': `import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ProductUnit, FarmingType, ProductStatus } from '../../common/enums';

@Entity('bulk_listings')
export class BulkListing {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'cooperative_id', type: 'uuid' })
  cooperativeId: string;

  @Column({ name: 'category_id', type: 'int', nullable: true })
  categoryId: number | null;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'total_quantity', type: 'decimal', precision: 15, scale: 2 })
  totalQuantity: number;

  @Column({ type: 'enum', enum: ProductUnit })
  unit: ProductUnit;

  @Column({ name: 'price_per_unit', type: 'decimal', precision: 15, scale: 2 })
  pricePerUnit: number;

  @Column({ name: 'farming_type', type: 'enum', enum: FarmingType, nullable: true })
  farmingType: FarmingType | null;

  @Column({ name: 'province_id', type: 'int', nullable: true })
  provinceId: number | null;

  @Column({ name: 'harvest_date_from', type: 'date', nullable: true })
  harvestDateFrom: string | null;

  @Column({ name: 'harvest_date_to', type: 'date', nullable: true })
  harvestDateTo: string | null;

  @Column({ type: 'enum', enum: ProductStatus, default: ProductStatus.DRAFT })
  status: ProductStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
`,
  'harvest-schedule.entity.ts': `import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ProductUnit } from '../../common/enums';

@Entity('harvest_schedules')
export class HarvestSchedule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'cooperative_id', type: 'uuid' })
  cooperativeId: string;

  @Column({ name: 'farmer_id', type: 'uuid' })
  farmerId: string;

  @Column({ name: 'product_id', type: 'uuid', nullable: true })
  productId: string | null;

  @Column({ name: 'expected_date', type: 'date' })
  expectedDate: string;

  @Column({ name: 'estimated_qty', type: 'decimal', precision: 10, scale: 2, nullable: true })
  estimatedQty: number | null;

  @Column({ type: 'enum', enum: ProductUnit, nullable: true })
  unit: ProductUnit | null;

  @Column({ name: 'actual_date', type: 'date', nullable: true })
  actualDate: string | null;

  @Column({ name: 'actual_qty', type: 'decimal', precision: 10, scale: 2, nullable: true })
  actualQty: number | null;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
`,
  'contract.entity.ts': `import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ProductUnit, ContractStatus } from '../../common/enums';

@Entity('contracts')
export class Contract {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'contract_code', length: 50, unique: true })
  contractCode: string;

  @Column({ name: 'buyer_id', type: 'uuid' })
  buyerId: string;

  @Column({ name: 'seller_id', type: 'uuid' })
  sellerId: string;

  @Column({ name: 'bulk_listing_id', type: 'uuid', nullable: true })
  bulkListingId: string | null;

  @Column({ name: 'product_category_id', type: 'int', nullable: true })
  productCategoryId: number | null;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  quantity: number;

  @Column({ type: 'enum', enum: ProductUnit })
  unit: ProductUnit;

  @Column({ name: 'unit_price', type: 'decimal', precision: 15, scale: 2 })
  unitPrice: number;

  @Column({ name: 'total_value', type: 'decimal', precision: 15, scale: 2 })
  totalValue: number;

  @Column({ name: 'quality_standards', type: 'text', nullable: true })
  qualityStandards: string | null;

  @Column({ name: 'delivery_deadline', type: 'date', nullable: true })
  deliveryDeadline: string | null;

  @Column({ name: 'payment_terms', type: 'text', nullable: true })
  paymentTerms: string | null;

  @Column({ type: 'enum', enum: ContractStatus, default: ContractStatus.DRAFT })
  status: ContractStatus;

  @Column({ name: 'buyer_signed_at', type: 'timestamptz', nullable: true })
  buyerSignedAt: Date | null;

  @Column({ name: 'seller_signed_at', type: 'timestamptz', nullable: true })
  sellerSignedAt: Date | null;

  @Column({ name: 'content_url', type: 'text', nullable: true })
  contentUrl: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
`,
  'purchase-request.entity.ts': `import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ProductUnit, FarmingType } from '../../common/enums';

@Entity('purchase_requests')
export class PurchaseRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'enterprise_id', type: 'uuid' })
  enterpriseId: string;

  @Column({ name: 'category_id', type: 'int', nullable: true })
  categoryId: number | null;

  @Column({ name: 'quantity_needed', type: 'decimal', precision: 15, scale: 2 })
  quantityNeeded: number;

  @Column({ type: 'enum', enum: ProductUnit })
  unit: ProductUnit;

  @Column({ name: 'quality_standard', type: 'text', nullable: true })
  qualityStandard: string | null;

  @Column({ name: 'farming_type', type: 'enum', enum: FarmingType, nullable: true })
  farmingType: FarmingType | null;

  @Column({ name: 'province_id', type: 'int', nullable: true })
  provinceId: number | null;

  @Column({ type: 'date', nullable: true })
  deadline: string | null;

  @Column({ length: 50, default: 'open' })
  status: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
`,
  'market-price.entity.ts': `import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
import { ProductUnit } from '../../common/enums';

@Entity('market_prices')
export class MarketPrice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'category_id', type: 'int' })
  categoryId: number;

  @Column({ name: 'province_id', type: 'int' })
  provinceId: number;

  @Column({ name: 'price_date', type: 'date' })
  priceDate: string;

  @Column({ name: 'min_price', type: 'decimal', precision: 15, scale: 2, nullable: true })
  minPrice: number | null;

  @Column({ name: 'max_price', type: 'decimal', precision: 15, scale: 2, nullable: true })
  maxPrice: number | null;

  @Column({ name: 'avg_price', type: 'decimal', precision: 15, scale: 2 })
  avgPrice: number;

  @Column({ type: 'enum', enum: ProductUnit })
  unit: ProductUnit;

  @Column({ length: 100, nullable: true })
  source: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
`,
  'traceability-record.entity.ts': `import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('traceability_records')
export class TraceabilityRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'product_id', type: 'uuid', nullable: true })
  productId: string | null;

  @Column({ name: 'order_item_id', type: 'uuid', nullable: true })
  orderItemId: string | null;

  @Column({ name: 'qr_code', length: 100, unique: true })
  qrCode: string;

  @Column({ name: 'batch_code', length: 100, nullable: true })
  batchCode: string | null;

  @Column({ name: 'planting_date', type: 'date', nullable: true })
  plantingDate: string | null;

  @Column({ name: 'harvest_date', type: 'date', nullable: true })
  harvestDate: string | null;

  @Column({ name: 'seed_variety', length: 100, nullable: true })
  seedVariety: string | null;

  @Column({ name: 'fertilizers_used', type: 'text', nullable: true })
  fertilizersUsed: string | null;

  @Column({ name: 'pesticides_used', type: 'text', nullable: true })
  pesticidesUsed: string | null;

  @Column({ name: 'storage_conditions', type: 'text', nullable: true })
  storageConditions: string | null;

  @Column({ name: 'processing_method', type: 'text', nullable: true })
  processingMethod: string | null;

  @Column({ name: 'quality_test_result', type: 'text', nullable: true })
  qualityTestResult: string | null;

  @Column({ name: 'quality_test_lab', length: 255, nullable: true })
  qualityTestLab: string | null;

  @Column({ name: 'quality_test_url', type: 'text', nullable: true })
  qualityTestUrl: string | null;

  @Column({ name: 'issued_at', type: 'timestamptz', default: () => 'now()' })
  issuedAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
`,
  'review.entity.ts': `import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('reviews')
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'order_id', type: 'uuid', nullable: true })
  orderId: string | null;

  @Column({ name: 'reviewer_id', type: 'uuid' })
  reviewerId: string;

  @Column({ name: 'reviewee_id', type: 'uuid' })
  revieweeId: string;

  @Column({ name: 'product_id', type: 'uuid', nullable: true })
  productId: string | null;

  @Column({ type: 'smallint' })
  rating: number;

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @Column({ type: 'text', array: true, default: [] })
  images: string[];

  @Column({ name: 'is_verified_purchase', default: true })
  isVerifiedPurchase: boolean;

  @Column({ name: 'seller_reply', type: 'text', nullable: true })
  sellerReply: string | null;

  @Column({ name: 'seller_reply_at', type: 'timestamptz', nullable: true })
  sellerReplyAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
`,
  'conversation.entity.ts': `import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('conversations')
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'order_id', type: 'uuid', nullable: true })
  orderId: string | null;

  @Column({ name: 'participant_1', type: 'uuid' })
  participant1: string;

  @Column({ name: 'participant_2', type: 'uuid' })
  participant2: string;

  @Column({ name: 'last_message_at', type: 'timestamptz', nullable: true })
  lastMessageAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
`,
  'message.entity.ts': `import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
import { MessageType } from '../../common/enums';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'conversation_id', type: 'uuid' })
  conversationId: string;

  @Column({ name: 'sender_id', type: 'uuid' })
  senderId: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ name: 'message_type', type: 'enum', enum: MessageType, default: MessageType.TEXT })
  messageType: MessageType;

  @Column({ name: 'attachment_url', type: 'text', nullable: true })
  attachmentUrl: string | null;

  @Column({ name: 'is_read', default: false })
  isRead: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
`,
  'notification.entity.ts': `export {
  NotificationOrmEntity as Notification,
} from '../../modules/notifications/infrastructure/persistence/notification.orm-entity';
`,
  'ad-package.entity.ts': `export { AdPackage } from '../../modules/ads/infrastructure/persistence/entities/ad-package.entity';
`,
  'ad-campaign.entity.ts': `export { AdCampaign } from '../../modules/ads/infrastructure/persistence/entities/ad-campaign.entity';
`,
  'ad-event.entity.ts': `export { AdEvent } from '../../modules/ads/infrastructure/persistence/entities/ad-event.entity';
`,
  'quality-certificate.entity.ts': `import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
import { CertType } from '../../common/enums';

@Entity('quality_certificates')
export class QualityCertificate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'issued_to', type: 'uuid' })
  issuedTo: string;

  @Column({ name: 'cert_type', type: 'enum', enum: CertType })
  certType: CertType;

  @Column({ name: 'cert_number', length: 100, unique: true })
  certNumber: string;

  @Column({ name: 'product_id', type: 'uuid', nullable: true })
  productId: string | null;

  @Column({ name: 'issued_by', type: 'uuid' })
  issuedBy: string;

  @Column({ name: 'issue_date', type: 'date' })
  issueDate: string;

  @Column({ name: 'expiry_date', type: 'date', nullable: true })
  expiryDate: string | null;

  @Column({ name: 'document_url', type: 'text', nullable: true })
  documentUrl: string | null;

  @Column({ length: 50, default: 'active' })
  status: string;

  @Column({ name: 'revoked_reason', type: 'text', nullable: true })
  revokedReason: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
`,
  'dispute.entity.ts': `import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
import { DisputeStatus } from '../../common/enums';

@Entity('disputes')
export class Dispute {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'order_id', type: 'uuid', nullable: true })
  orderId: string | null;

  @Column({ name: 'raised_by', type: 'uuid' })
  raisedBy: string;

  @Column({ name: 'against_user', type: 'uuid' })
  againstUser: string;

  @Column({ type: 'text' })
  reason: string;

  @Column({ name: 'evidence_urls', type: 'text', array: true, default: [] })
  evidenceUrls: string[];

  @Column({ type: 'enum', enum: DisputeStatus, default: DisputeStatus.OPEN })
  status: DisputeStatus;

  @Column({ name: 'handled_by', type: 'uuid', nullable: true })
  handledBy: string | null;

  @Column({ type: 'text', nullable: true })
  resolution: string | null;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
`,
  'system-config.entity.ts': `export { SystemConfig } from '../../modules/admin/entities/system-config.entity';
`,
  'audit-log.entity.ts': `export { AuditLog } from '../../modules/admin/entities/audit-log.entity';
`,
};

const phase5CompatibilityEntities = {
  'product.entity.ts': `export { Product } from '../../modules/products/infrastructure/persistence/entities/product.entity';
`,
  'product-category.entity.ts': `export { ProductCategory } from '../../modules/products/infrastructure/persistence/entities/product-category.entity';
`,
  'product-image.entity.ts': `export { ProductImage } from '../../modules/products/infrastructure/persistence/entities/product-image.entity';
`,
  'product-certification.entity.ts': `export { ProductCertification } from '../../modules/products/infrastructure/persistence/entities/product-certification.entity';
`,
  'product-wishlist.entity.ts': `export { Wishlist as ProductWishlist } from '../../modules/products/infrastructure/persistence/entities/wishlist.entity';
`,
  'review.entity.ts': `export { Review } from '../../modules/reviews/infrastructure/persistence/entities/review.entity';
`,
};
Object.assign(entities, phase5CompatibilityEntities);

for (const [filename, content] of Object.entries(entities)) {
  fs.writeFileSync(path.join(entitiesDir, filename), content, 'utf8');
}
console.log('Successfully generated ' + Object.keys(entities).length + ' entities.');
