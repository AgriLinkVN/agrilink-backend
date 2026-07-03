/**
 * All application-wide enums derived from the AgriLink database schema.
 * These are used in TypeORM entities, DTOs, and business logic.
 */

export enum UserRole {
  FARMER = 'farmer',
  COOPERATIVE = 'cooperative',
  BUYER = 'buyer',
  ENTERPRISE = 'enterprise',
  SUPPLIER = 'supplier',
  LOGISTICS = 'logistics',
  STATE_AGENCY = 'state_agency',
  ADMIN = 'admin',
}

export enum UserStatus {
  PENDING_VERIFICATION = 'pending_verification',
  ACTIVE = 'active',
  LOCKED = 'locked',
  REJECTED = 'rejected',
}

export enum OtpType {
  SMS = 'sms',
  EMAIL = 'email',
}

export enum OtpPurpose {
  REGISTER = 'register',
  LOGIN = 'login',
  RESET_PASSWORD = 'reset_password',
}

export enum FarmingType {
  ORGANIC = 'organic',
  TRADITIONAL = 'traditional',
  VIETGAP = 'vietgap',
  GLOBALGAP = 'globalgap',
}

export enum ProductUnit {
  KG = 'kg',
  TON = 'ton',
  BOX = 'box',
  BUNCH = 'bunch',
  LITER = 'liter',
  PIECE = 'piece',
}

export enum ProductStatus {
  DRAFT = 'draft',
  PENDING_APPROVAL = 'pending_approval',
  ACTIVE = 'active',
  OUT_OF_STOCK = 'out_of_stock',
  REJECTED = 'rejected',
  ARCHIVED = 'archived',
  SUSPENDED = 'suspended',
}

export enum SellerType {
  FARMER = 'farmer',
  COOPERATIVE = 'cooperative',
  SUPPLIER = 'supplier',
}

export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PREPARING = 'preparing',
  HANDED_TO_LOGISTICS = 'handed_to_logistics',
  SHIPPING = 'shipping',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  DISPUTED = 'disputed',
}

export enum PaymentMethod {
  COD = 'cod',
  BANK_TRANSFER = 'bank_transfer',
  PAYOS = 'payos',
  MOMO = 'momo',
  ESCROW = 'escrow',
}

export enum PaymentStatus {
  UNPAID = 'unpaid',
  PAID = 'paid',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded',
}

export enum ShipmentStatus {
  WAITING_PICKUP = 'waiting_pickup',
  PICKED_UP = 'picked_up',
  IN_TRANSIT = 'in_transit',
  OUT_FOR_DELIVERY = 'out_for_delivery',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  RETURNED = 'returned',
}

export enum MemberStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  LEFT = 'left',
}

export enum ContractStatus {
  DRAFT = 'draft',
  NEGOTIATING = 'negotiating',
  PENDING_SIGNATURE = 'pending_signature',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  DISPUTED = 'disputed',
}

export enum CertType {
  VIETGAP = 'vietgap',
  ORGANIC = 'organic',
  GLOBALGAP = 'globalgap',
  OCOP = 'ocop',
  OTHER = 'other',
}

export enum CertificationStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
}

export enum NotifType {
  NEW_ORDER = 'new_order',
  ORDER_CONFIRMED = 'order_confirmed',
  ORDER_SHIPPED = 'order_shipped',
  ORDER_DELIVERED = 'order_delivered',
  NEW_MESSAGE = 'new_message',
  PRODUCT_APPROVED = 'product_approved',
  PRODUCT_REJECTED = 'product_rejected',
  PRODUCT_STATUS_CHANGED = 'product_status_changed',
  PRICE_ALERT = 'price_alert',
  MEMBER_REQUEST = 'member_request',
  CONTRACT_SIGNED = 'contract_signed',
  DISPUTE_OPENED = 'dispute_opened',
}

export enum AdType {
  BANNER = 'banner',
  FEATURED = 'featured',
  SPOTLIGHT = 'spotlight',
}

export enum AdStatus {
  PENDING_APPROVAL = 'pending_approval',
  ACTIVE = 'active',
  PAUSED = 'paused',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}

export enum DisputeStatus {
  OPEN = 'open',
  UNDER_REVIEW = 'under_review',
  RESOLVED_BUYER = 'resolved_buyer',
  RESOLVED_SELLER = 'resolved_seller',
  CLOSED = 'closed',
}

export enum Region {
  NORTH = 'north',
  CENTRAL = 'central',
  SOUTH = 'south',
  HIGHLANDS = 'highlands',
}

export enum SupplierType {
  FERTILIZER = 'fertilizer',
  PESTICIDE = 'pesticide',
  EQUIPMENT = 'equipment',
  MIXED = 'mixed',
}

export enum IncidentType {
  DAMAGED = 'damaged',
  LOST = 'lost',
  UNREACHABLE = 'unreachable',
  OTHER = 'other',
}

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  FILE = 'file',
}
