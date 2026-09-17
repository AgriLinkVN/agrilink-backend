import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('cooperative_province_references')
export class CooperativeProvinceReferenceEntity {
  @PrimaryColumn({ name: 'cooperative_id', type: 'uuid' })
  cooperativeId: string;

  @Column({ name: 'province_id', type: 'uuid', unique: false })
  provinceId: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
