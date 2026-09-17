import {
  FarmingType,
  ProductStatus,
  ProductUnit,
  SellerType,
} from '@common/enums';
import { Product } from '../persistence/entities/product.entity';
import { ProductCategory } from '../persistence/entities/product-category.entity';
import { ProductImage } from '../persistence/entities/product-image.entity';
import { Wishlist } from '../persistence/entities/wishlist.entity';
import { TypeOrmProductRepository } from './typeorm-product.repository';

const PRODUCT_ID = '11111111-1111-4111-8111-111111111111';
const SELLER_ID = '33333333-3333-4333-8333-333333333333';
const OTHER_SELLER_ID = '44444444-4444-4444-8444-444444444444';
const USER_ID = '55555555-5555-4555-8555-555555555555';
const CATEGORY_ID = '77777777-7777-4777-8777-777777777777';

describe('TypeOrmProductRepository', () => {
  let repository: TypeOrmProductRepository;
  let productRepo: ReturnType<typeof createRepositoryMock>;
  let imageRepo: ReturnType<typeof createRepositoryMock>;
  let certRepo: ReturnType<typeof createRepositoryMock>;
  let categoryRepo: ReturnType<typeof createRepositoryMock>;
  let wishlistRepo: ReturnType<typeof createRepositoryMock>;
  let dataSource: { transaction: jest.Mock; query: jest.Mock };

  beforeEach(() => {
    productRepo = createRepositoryMock();
    imageRepo = createRepositoryMock();
    certRepo = createRepositoryMock();
    categoryRepo = createRepositoryMock();
    wishlistRepo = createRepositoryMock();
    dataSource = {
      transaction: jest.fn(),
      query: jest.fn(),
    };

    repository = new TypeOrmProductRepository(
      productRepo as never,
      imageRepo as never,
      certRepo as never,
      categoryRepo as never,
      wishlistRepo as never,
      dataSource as never,
    );
  });

  it('keeps public listing active-only even when a status filter is provided', async () => {
    const queryBuilder = createQueryBuilderMock<Product>([[], 0]);
    productRepo.createQueryBuilder.mockReturnValue(queryBuilder);

    await repository.findAll({
      page: 2,
      limit: 10,
      search: 'xoai',
      sellerId: OTHER_SELLER_ID,
      status: ProductStatus.DRAFT,
      sortBy: 'pricePerUnit',
      order: 'ASC',
    });

    expect(queryBuilder.orderBy).toHaveBeenCalledWith('p.pricePerUnit', 'ASC');
    expect(queryBuilder.skip).toHaveBeenCalledWith(10);
    expect(queryBuilder.take).toHaveBeenCalledWith(10);
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      'p.name ILIKE :search OR p.description ILIKE :search',
      { search: '%xoai%' },
    );
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      'p.sellerId = :sellerId',
      { sellerId: OTHER_SELLER_ID },
    );
    expect(queryBuilder.andWhere).toHaveBeenCalledWith('p.status = :status', {
      status: ProductStatus.ACTIVE,
    });
    expect(queryBuilder.andWhere).not.toHaveBeenCalledWith(
      'p.status = :status',
      { status: ProductStatus.DRAFT },
    );
  });

  it('allows the current seller to filter their own products by non-active status', async () => {
    const queryBuilder = createQueryBuilderMock<Product>([[], 0]);
    productRepo.createQueryBuilder.mockReturnValue(queryBuilder);

    await repository.findAll(
      {
        sellerId: SELLER_ID,
        status: ProductStatus.DRAFT,
      },
      SELLER_ID,
    );

    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      'p.sellerId = :sellerId',
      { sellerId: SELLER_ID },
    );
    expect(queryBuilder.andWhere).toHaveBeenCalledWith('p.status = :status', {
      status: ProductStatus.DRAFT,
    });
  });

  it('keeps wishlist listing active-only and paginated', async () => {
    const activeProduct = makeProduct({ id: PRODUCT_ID });
    const queryBuilder = createQueryBuilderMock<Wishlist>([
      [{ product: activeProduct } as Wishlist],
      1,
    ]);
    wishlistRepo.createQueryBuilder.mockReturnValue(queryBuilder);

    const result = await repository.getWishlist(USER_ID, {
      page: 3,
      limit: 5,
    });

    expect(queryBuilder.where).toHaveBeenCalledWith('w.userId = :userId', {
      userId: USER_ID,
    });
    expect(queryBuilder.andWhere).toHaveBeenCalledWith('p.status = :status', {
      status: ProductStatus.ACTIVE,
    });
    expect(queryBuilder.skip).toHaveBeenCalledWith(10);
    expect(queryBuilder.take).toHaveBeenCalledWith(5);
    expect(result).toEqual({
      data: [activeProduct],
      total: 1,
      page: 3,
      limit: 5,
    });
  });

  it('creates a draft product and normalizes image defaults transactionally', async () => {
    const savedProduct = makeProduct({ status: ProductStatus.DRAFT });
    const manager = {
      create: jest.fn((_entity, value) => value),
      save: jest.fn(async (entity, value) => {
        if (entity === Product) return { ...value, id: PRODUCT_ID };
        return value;
      }),
      findOneOrFail: jest.fn().mockResolvedValue(savedProduct),
    };
    dataSource.transaction.mockImplementation(async (work) => work(manager));

    const result = await repository.createAtomically(
      SELLER_ID,
      SellerType.FARMER,
      {
        name: 'Xoai cat Hoa Loc',
        pricePerUnit: 25000,
        unit: ProductUnit.KG,
        availableQuantity: 100,
        images: [{ imageUrl: 'https://example.test/product.jpg' }],
      },
    );

    expect(result).toBe(savedProduct);
    expect(manager.create).toHaveBeenCalledWith(
      Product,
      expect.objectContaining({
        sellerId: SELLER_ID,
        sellerType: SellerType.FARMER,
        status: ProductStatus.DRAFT,
      }),
    );
    expect(manager.save).toHaveBeenCalledWith(ProductImage, [
      expect.objectContaining({
        productId: PRODUCT_ID,
        imageUrl: 'https://example.test/product.jpg',
        isPrimary: true,
        sortOrder: 0,
      }),
    ]);
  });

  it('propagates a child write failure so the product creation transaction rolls back', async () => {
    const manager = {
      create: jest.fn((_entity, value) => value),
      save: jest.fn(async (entity, value) => {
        if (entity === Product) return { ...value, id: PRODUCT_ID };
        if (entity === ProductImage)
          throw new Error('image persistence failed');
        return value;
      }),
      findOneOrFail: jest.fn(),
    };
    dataSource.transaction.mockImplementation(async (work) => work(manager));

    await expect(
      repository.createAtomically(SELLER_ID, SellerType.FARMER, {
        name: 'Xoai cat Hoa Loc',
        pricePerUnit: 25000,
        unit: ProductUnit.KG,
        availableQuantity: 100,
        images: [{ imageUrl: 'https://example.test/product.jpg' }],
      }),
    ).rejects.toThrow('image persistence failed');
    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
  });

  it('uses conflict-safe insertion when adding a wishlist item', async () => {
    const entry = Object.assign(new Wishlist(), {
      id: '88888888-8888-4888-8888-888888888888',
      userId: USER_ID,
      productId: PRODUCT_ID,
    });
    const queryBuilder = {
      insert: jest.fn(),
      into: jest.fn(),
      values: jest.fn(),
      orIgnore: jest.fn(),
      execute: jest.fn().mockResolvedValue(undefined),
    };
    queryBuilder.insert.mockReturnValue(queryBuilder);
    queryBuilder.into.mockReturnValue(queryBuilder);
    queryBuilder.values.mockReturnValue(queryBuilder);
    queryBuilder.orIgnore.mockReturnValue(queryBuilder);
    wishlistRepo.createQueryBuilder.mockReturnValue(queryBuilder);
    wishlistRepo.findOne.mockResolvedValue(entry);

    await expect(repository.addIfAbsent(USER_ID, PRODUCT_ID)).resolves.toBe(
      entry,
    );
    expect(queryBuilder.values).toHaveBeenCalledWith({
      userId: USER_ID,
      productId: PRODUCT_ID,
    });
    expect(queryBuilder.orIgnore).toHaveBeenCalledTimes(1);
  });
});

function createRepositoryMock() {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => value),
    update: jest.fn(),
    count: jest.fn(),
    remove: jest.fn(),
    delete: jest.fn(),
    clear: jest.fn(),
    query: jest.fn(),
    increment: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
}

function createQueryBuilderMock<TEntity>(
  itemsAndTotal: [TEntity[], number] = [[], 0],
) {
  const queryBuilder = {
    leftJoinAndSelect: jest.fn(),
    innerJoinAndSelect: jest.fn(),
    orderBy: jest.fn(),
    skip: jest.fn(),
    take: jest.fn(),
    andWhere: jest.fn(),
    where: jest.fn(),
    getManyAndCount: jest.fn().mockResolvedValue(itemsAndTotal),
  };

  Object.values(queryBuilder).forEach((method) => {
    if (
      jest.isMockFunction(method) &&
      method !== queryBuilder.getManyAndCount
    ) {
      method.mockReturnValue(queryBuilder);
    }
  });

  return queryBuilder;
}

function makeCategory(
  overrides: Partial<ProductCategory> = {},
): ProductCategory {
  return {
    id: CATEGORY_ID,
    name: 'Trai cay',
    slug: 'trai-cay',
    description: null,
    parentId: null,
    iconUrl: null,
    sortOrder: 0,
    isActive: true,
    createdAt: new Date('2026-06-01T00:00:00.000Z'),
    updatedAt: new Date('2026-06-01T00:00:00.000Z'),
    parent: null,
    children: [],
    ...overrides,
  } as ProductCategory;
}

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: PRODUCT_ID,
    sellerId: SELLER_ID,
    sellerType: SellerType.FARMER,
    name: 'Xoai cat Hoa Loc',
    description: 'Xoai tuoi',
    categoryId: CATEGORY_ID,
    sku: 'XCHL-001',
    variety: 'Hoa Loc',
    pricePerUnit: 25000,
    unit: ProductUnit.KG,
    availableQuantity: 100,
    minOrderQuantity: 5,
    status: ProductStatus.ACTIVE,
    farmingType: FarmingType.VIETGAP,
    provinceId: null,
    districtId: null,
    farmLatitude: null,
    farmLongitude: null,
    harvestDate: null,
    expiryDate: null,
    rejectionReason: null,
    isFeatured: false,
    viewCount: 0,
    soldCount: 0,
    avgRating: 0,
    createdAt: new Date('2026-06-01T00:00:00.000Z'),
    updatedAt: new Date('2026-06-01T00:00:00.000Z'),
    category: makeCategory(),
    images: [],
    certifications: [],
    ...overrides,
  } as Product;
}
