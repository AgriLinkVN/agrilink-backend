import { CooperativePersistenceMapper } from './cooperative-persistence.mapper';
import { CooperativeMemberEntity } from '../entities/cooperative-member.entity';
import { HarvestScheduleEntity } from '../entities/harvest-schedule.entity';

describe('CooperativePersistenceMapper', () => {
  it('preserves nullable fields and decimal values at the infrastructure boundary', () => {
    const createdAt = new Date('2026-07-24T00:00:00.000Z');
    const schedule = {
      id: 'f59b5a60-e5a9-4e41-bbdc-58dd93bb9d41',
      userId: '7d0bca90-4af8-4b2f-a4f5-7e0c9772c327',
      productId: null,
      cropName: 'Mango',
      expectedHarvestDate: new Date('2026-08-10'),
      estimatedQuantity: '1250.50',
      unit: 'kg',
      notes: null,
      createdAt,
      updatedAt: createdAt,
    } as HarvestScheduleEntity;

    expect(CooperativePersistenceMapper.toScheduleModel(schedule)).toEqual(
      schedule,
    );
    expect(
      CooperativePersistenceMapper.toScheduleEntity(
        CooperativePersistenceMapper.toScheduleModel(schedule),
      ),
    ).toEqual(schedule);
  });

  it('keeps a member status owned by P3 rather than a Product enum', () => {
    const createdAt = new Date('2026-07-24T00:00:00.000Z');
    const member = {
      id: '2ec70751-3a35-4e89-8c17-15b2e65076f7',
      cooperativeId: 'd1c7c7ec-78b4-4a03-aa70-fc1db5e3c537',
      farmerId: 'af759612-6c8f-4a4e-b780-9821bcf94597',
      status: 'suspended',
      role: null,
      joinedAt: null,
      createdAt,
      updatedAt: createdAt,
    } as CooperativeMemberEntity;

    expect(CooperativePersistenceMapper.toMemberModel(member).status).toBe(
      'suspended',
    );
  });
});
