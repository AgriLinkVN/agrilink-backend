import { Column, Entity, ManyToOne, JoinColumn, PrimaryGeneratedColumn } from 'typeorm';
import { Province } from './province.entity';

@Entity('districts')
export class District {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** FK → provinces.id */
  @Column({ name: 'province_id' })
  provinceId: string;

  @ManyToOne(() => Province, (province) => province.districts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'province_id' })
  province: Province;

  @Column()
  name: string;

  @Column({ name: 'name_en', nullable: true })
  nameEn: string;

  @Column({ name: 'code', nullable: true })
  code: string;
}
