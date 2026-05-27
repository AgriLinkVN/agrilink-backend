/**
 * All application-wide enums derived from the AgriLink database schema.
 * These are used in TypeORM entities, DTOs, and business logic.
 */

export enum UserRole {
  farmer = 'farmer',
  cooperative = 'cooperative',
  buyer = 'buyer',
  enterprise = 'enterprise',
  supplier = 'supplier',
  state_agency = 'state_agency',
  government = 'government',
  admin = 'admin',
}

export enum UserStatus {
  pending_verification = 'pending_verification',
  active = 'active',
  locked = 'locked',
  rejected = 'rejected',
}

export enum OtpType {
  sms = 'sms',
  email = 'email',
}

export enum OtpPurpose {
  register = 'register',
  login = 'login',
  reset_password = 'reset_password',
}

export enum FarmingType {
  organic = 'organic',
  traditional = 'traditional',
  vietgap = 'vietgap',
  globalgap = 'globalgap',
}

export enum ProductUnit {
  kg = 'kg',
  ton = 'ton',
  box = 'box',
  bunch = 'bunch',
  liter = 'liter',
  piece = 'piece',
}

export enum ProductStatus {
  draft = 'draft',
  pending_approval = 'pending_approval',
  active = 'active',
  out_of_stock = 'out_of_stock',
  rejected = 'rejected',
  archived = 'archived',
  suspended = 'suspended',
}

export enum SellerType {
  farmer = 'farmer',
  cooperative = 'cooperative',
  supplier = 'supplier',
}

export enum MemberStatus {
  pending = 'pending',
  active = 'active',
  suspended = 'suspended',
  left = 'left',
}

export enum CertType {
  vietgap = 'vietgap',
  organic = 'organic',
  globalgap = 'globalgap',
  ocop = 'ocop',
  other = 'other',
}

export enum NotifType {
  new_order = 'new_order',
  product_approved = 'product_approved',
  product_rejected = 'product_rejected',
  price_alert = 'price_alert',
  member_request = 'member_request',
  new_message = 'new_message',
}

export enum AdType {
  banner = 'banner',
  featured = 'featured',
  spotlight = 'spotlight',
}

export enum AdStatus {
  pending_approval = 'pending_approval',
  active = 'active',
  paused = 'paused',
  rejected = 'rejected',
  expired = 'expired',
}

export enum DisputeStatus {
  open = 'open',
  under_review = 'under_review',
  resolved_buyer = 'resolved_buyer',
  resolved_seller = 'resolved_seller',
  closed = 'closed',
}

export enum Region {
  north = 'north',
  central = 'central',
  south = 'south',
  highlands = 'highlands',
}

export enum SupplierType {
  fertilizer = 'fertilizer',
  pesticide = 'pesticide',
  equipment = 'equipment',
  mixed = 'mixed',
}

export enum MessageType {
  text = 'text',
  image = 'image',
  file = 'file',
}
