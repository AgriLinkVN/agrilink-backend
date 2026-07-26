import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('user_addresses')
export class UserAddress {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ length: 100, nullable: true })
  label: string | null;

  @Column({ name: 'full_name', length: 255 })
  fullName: string;

  @Column({ length: 15 })
  phone: string;

  @Column({ name: 'address_line', type: 'text' })
  addressLine: string;

  @Column({ name: 'province_id', type: 'int', nullable: true })
  provinceId: number | null;

  @Column({ name: 'district_id', type: 'int', nullable: true })
  districtId: number | null;

  @Column({ length: 255, nullable: true })
  ward: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  latitude: number | null;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  longitude: number | null;

  @Column({ name: 'is_default', default: false })
  isDefault: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
