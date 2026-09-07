import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
import { IncidentType } from '../../common/enums';

@Entity('incident_reports')
export class IncidentReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'shipment_id', type: 'uuid' })
  shipmentId: string;

  @Column({ name: 'reported_by', type: 'uuid' })
  reportedBy: string;

  @Column({ name: 'incident_type', type: 'enum', enum: IncidentType })
  incidentType: IncidentType;

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'evidence_urls', type: 'text', array: true, default: [] })
  evidenceUrls: string[];

  @Column({ length: 50, default: 'open' })
  status: string;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
