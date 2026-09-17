import { Repository } from 'typeorm';
import { CooperativeMemberEntity } from '../entities/cooperative-member.entity';
import { CooperativeProvinceReferenceEntity } from '../entities/cooperative-province-reference.entity';
import {
  TypeOrmCooperativeMemberRepository,
  TypeOrmCooperativeProvinceReferenceRepository,
} from './typeorm-cooperative-persistence.repositories';

describe('P3 TypeORM persistence adapters', () => {
  it('finds memberships only by cooperative and farmer ownership pair', async () => {
    const findOne = jest.fn().mockResolvedValue(null);
    const repository = new TypeOrmCooperativeMemberRepository({
      findOne,
    } as unknown as Repository<CooperativeMemberEntity>);

    await expect(
      repository.findByCooperativeAndFarmer('cooperative-id', 'farmer-id'),
    ).resolves.toBeNull();
    expect(findOne).toHaveBeenCalledWith({
      where: { cooperativeId: 'cooperative-id', farmerId: 'farmer-id' },
    });
  });

  it('persists only canonical UUID province references', async () => {
    const reference = {
      cooperativeId: '47066a28-0a6c-4846-af49-cd7dc8a0c675',
      provinceId: '0e3d55b4-c2ca-45d1-b3cc-9e9f65a42774',
      createdAt: new Date('2026-07-24T00:00:00.000Z'),
      updatedAt: new Date('2026-07-24T00:00:00.000Z'),
    };
    const save = jest.fn().mockResolvedValue(reference);
    const repository = new TypeOrmCooperativeProvinceReferenceRepository({
      save,
    } as unknown as Repository<CooperativeProvinceReferenceEntity>);

    await expect(repository.save(reference)).resolves.toEqual(reference);
    expect(save).toHaveBeenCalledWith(reference);
  });
});
