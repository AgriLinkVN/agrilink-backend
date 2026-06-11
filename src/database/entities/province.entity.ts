import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { Region } from '../../common/enums';

@Entity('provinces')
export class Province {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 10, unique: true })
  code: string;

  @Column({ type: 'enum', enum: Region })
  region: Region;

  @Column({ name: 'is_key_agri', default: false })
  isKeyAgri: boolean;
}
