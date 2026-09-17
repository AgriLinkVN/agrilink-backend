import {
  SeedClassification,
  SeedExecutionContext,
} from "../../../../database/seeds/framework/seed-contract";
import { EMPTY_SEED_DEPENDENCY_OUTPUTS } from "../../../../database/seeds/framework/seed-dependency-outputs";
import {
  GeographyProvinceReferenceSeedGroup,
  PROVINCE_ID_BY_CODE_OUTPUT_KIND,
  ProvinceReferenceMutableData,
  ProvinceReferenceSeedWriter,
  provinceReferenceSeedData,
} from "./province-reference.seed";

const referenceContext: SeedExecutionContext = {
  nodeEnv: "test",
  databaseName: "agrilink_test_disposable",
  classifications: [SeedClassification.REFERENCE],
  dependencies: EMPTY_SEED_DEPENDENCY_OUTPUTS,
};

function createWriter(existingCodes: readonly string[] = []): {
  writer: ProvinceReferenceSeedWriter;
  codes: Set<string>;
  creates: string[];
  updates: ProvinceReferenceMutableData[];
  finds: string[];
} {
  const codes = new Set(existingCodes);
  const creates: string[] = [];
  const updates: ProvinceReferenceMutableData[] = [];
  const finds: string[] = [];
  const writer: ProvinceReferenceSeedWriter = {
    async findByCode(code) {
      finds.push(code);
      return codes.has(code) ? { id: `province-${code}` } : null;
    },
    async create(data) {
      creates.push(data.code);
      codes.add(data.code);
      return { id: `province-${data.code}` };
    },
    async update(_id, data) {
      updates.push(data);
    },
  };

  return { writer, codes, creates, updates, finds };
}

describe("GeographyProvinceReferenceSeedGroup", () => {
  it("declares Geography-owned REFERENCE metadata without dependencies", () => {
    const { writer } = createWriter();
    const group = new GeographyProvinceReferenceSeedGroup(writer);

    expect(group.metadata).toEqual(
      expect.objectContaining({
        id: "geography.reference.provinces",
        owner: "geography",
        classification: SeedClassification.REFERENCE,
        dependencies: [],
      }),
    );
  });

  it("keeps exactly 34 canonical rows with unique province codes", () => {
    const codes = provinceReferenceSeedData.map(({ code }) => code);

    expect(provinceReferenceSeedData).toHaveLength(34);
    expect(new Set(codes).size).toBe(34);
  });

  it("reconciles every code independently when the state is partial", async () => {
    const firstCode = provinceReferenceSeedData[0].code;
    const state = createWriter([firstCode]);
    const group = new GeographyProvinceReferenceSeedGroup(state.writer);

    const firstResult = await group.execute(referenceContext);

    expect(state.finds).toHaveLength(34);
    expect(state.updates).toHaveLength(1);
    expect(state.updates[0]).not.toHaveProperty("code");
    expect(state.creates).toHaveLength(33);
    expect(state.codes.size).toBe(34);
    expect(firstResult.outputs).toEqual(
      provinceReferenceSeedData.map(({ code }) => ({
        kind: PROVINCE_ID_BY_CODE_OUTPUT_KIND,
        key: code,
        value: `province-${code}`,
      })),
    );

    const secondResult = await group.execute(referenceContext);

    expect(state.creates).toHaveLength(33);
    expect(state.updates).toHaveLength(35);
    expect(secondResult).toEqual(firstResult);
  });

  it("refuses execution without explicit REFERENCE selection", async () => {
    const { writer } = createWriter();
    const group = new GeographyProvinceReferenceSeedGroup(writer);

    await expect(
      group.execute({
        ...referenceContext,
        classifications: [SeedClassification.DEV],
      }),
    ).rejects.toThrow("requires explicit REFERENCE selection");
  });
});
