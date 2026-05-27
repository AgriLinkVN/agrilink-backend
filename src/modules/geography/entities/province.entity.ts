import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { Region } from '../../../common/enums';

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
}
