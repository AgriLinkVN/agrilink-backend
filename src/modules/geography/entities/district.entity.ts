import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('districts')
export class District {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** FK → provinces.id */
  @Column({ name: 'province_id' })
  provinceId: string;

  @Column()
  name: string;

  @Column({ name: 'name_en', nullable: true })
  nameEn: string;

  @Column({ name: 'code', nullable: true })
  code: string;
}
