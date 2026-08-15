import { Product } from "../modules/products/infrastructure/persistence/entities/product.entity";
import { resolveDevSeedProductsForOrchestration } from "./dev-seed.service";

describe("DevSeedService Product orchestration", () => {
  it("skips the legacy Product write section after canonical Products DEV", async () => {
    const canonicalProducts = [{ id: "product-1" } as Product];
    const seed = jest.fn<Promise<Product[]>, []>();
    const loadExisting = jest
      .fn<Promise<Product[]>, []>()
      .mockResolvedValue(canonicalProducts);

    await expect(
      resolveDevSeedProductsForOrchestration(
        { skipProducts: true },
        { seed, loadExisting },
      ),
    ).resolves.toBe(canonicalProducts);
    expect(seed).not.toHaveBeenCalled();
    expect(loadExisting).toHaveBeenCalledTimes(1);
  });

  it("preserves the legacy Product section outside canonical startup", async () => {
    const seededProducts = [{ id: "legacy-product" } as Product];
    const seed = jest
      .fn<Promise<Product[]>, []>()
      .mockResolvedValue(seededProducts);
    const loadExisting = jest.fn<Promise<Product[]>, []>();

    await expect(
      resolveDevSeedProductsForOrchestration({}, { seed, loadExisting }),
    ).resolves.toBe(seededProducts);
    expect(seed).toHaveBeenCalledTimes(1);
    expect(loadExisting).not.toHaveBeenCalled();
  });

  it("fails closed when canonical Product rows are unavailable", async () => {
    await expect(
      resolveDevSeedProductsForOrchestration(
        { skipProducts: true },
        {
          seed: jest.fn<Promise<Product[]>, []>(),
          loadExisting: jest.fn<Promise<Product[]>, []>().mockResolvedValue([]),
        },
      ),
    ).rejects.toThrow("requires canonical Products DEV rows");
  });
});
