import { ProductDevelopmentSeedService } from './product-development-seed.service';

describe('ProductDevelopmentSeedService', () => {
  const categoryQuery = {
    findAllCategories: jest.fn(),
  };
  const seedRepository = {
    seedCategories: jest.fn(),
    countProducts: jest.fn(),
    resetProducts: jest.fn(),
    saveSeedProducts: jest.fn(),
    savePrimaryImagesForProducts: jest.fn(),
  };

  let service: ProductDevelopmentSeedService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProductDevelopmentSeedService(
      categoryQuery as never,
      seedRepository as never,
    );
  });

  it('seeds categories but never resets existing Product data by default', async () => {
    seedRepository.countProducts.mockResolvedValue(12);

    await expect(service.seedForDevelopment()).resolves.toEqual({
      deleted: 0,
      seeded: 0,
      skipped: 12,
    });

    expect(seedRepository.seedCategories).toHaveBeenCalledTimes(1);
    expect(seedRepository.resetProducts).not.toHaveBeenCalled();
  });

  it('only resets Product data when explicitly requested', async () => {
    seedRepository.resetProducts.mockResolvedValue(12);
    seedRepository.countProducts.mockResolvedValue(0);
    categoryQuery.findAllCategories.mockResolvedValue([]);
    seedRepository.saveSeedProducts.mockResolvedValue([]);

    await expect(service.seedForDevelopment({ reset: true })).resolves.toEqual({
      deleted: 12,
      seeded: 0,
      skipped: 0,
    });

    expect(seedRepository.resetProducts).toHaveBeenCalledTimes(1);
  });
});
