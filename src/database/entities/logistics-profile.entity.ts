import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

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
