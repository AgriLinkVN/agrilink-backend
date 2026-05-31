import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Region } from '../../../common/enums';
import { District } from './district.entity';

@Entity('provinces')
export class Province {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ name: 'name_en', nullable: true })
  nameEn: string;

  @Column({ name: 'code', unique: true, nullable: true })
  code: string;

  @Column({ type: 'enum', enum: Region, nullable: true })
  region: Region;

  /** Latitude of province center (for map marker) */
  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  lat: number;

  /** Longitude of province center (for map marker) */
  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  lng: number;

  /** URL-friendly slug, e.g. "ha-noi", "da-nang" */
  @Column({ unique: true, nullable: true })
  slug: string;

  @OneToMany(() => District, (district) => district.province)
  districts: District[];
}
