import { ProfileVerificationConflictError } from "../../src/modules/profiles/application/errors/profile-verification.errors";
import { ProfilesService } from "../../src/modules/profiles/profiles.service";

const PROFILE_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "22222222-2222-4222-8222-222222222222";
const REVIEWER_A = "33333333-3333-4333-8333-333333333333";
const REVIEWER_B = "44444444-4444-4444-8444-444444444444";

describe("Persistence Phase 4 verification lifecycle", () => {
  it.each([
    ["farmer", "isKycVerified"],
    ["cooperative", "isVerified"],
    ["enterprise", "isVerified"],
    ["supplier", "isVerified"],
  ] as const)(
    "conditionally approves a pending %s profile",
    async (type, field) => {
      const harness = makeHarness(type);

      const result = await harness.service.transitionVerification({
        profileType: type,
        profileId: PROFILE_ID,
        reviewerId: REVIEWER_A,
        approve: true,
      });

      expect(result.afterStatus).toBe("approved");
      expect(result.profile).toMatchObject({
        id: PROFILE_ID,
        [field]: true,
        verifiedBy: REVIEWER_A,
        rejectionReason: null,
      });
      expect(harness.repository.update).toHaveBeenCalledTimes(1);
    },
  );

  it.each(["farmer", "cooperative", "enterprise", "supplier"] as const)(
    "conditionally rejects a pending %s profile with a reason",
    async (type) => {
      const harness = makeHarness(type);
      const result = await harness.service.transitionVerification({
        profileType: type,
        profileId: PROFILE_ID,
        reviewerId: REVIEWER_A,
        approve: false,
        rejectionReason: "Document mismatch",
      });
      expect(result.afterStatus).toBe("rejected");
      expect(result.profile.rejectionReason).toBe("Document mismatch");
    },
  );

  it("requires a rejection reason before persistence", async () => {
    const harness = makeHarness("farmer");
    await expect(
      harness.service.transitionVerification({
        profileType: "farmer",
        profileId: PROFILE_ID,
        reviewerId: REVIEWER_A,
        approve: false,
      }),
    ).rejects.toThrow("rejection reason");
    expect(harness.repository.update).not.toHaveBeenCalled();
  });

  it.each([
    ["approved", true, null],
    ["rejected", false, "Previous rejection"],
  ] as const)(
    "blocks a transition from an already %s profile",
    async (_state, verified, reason) => {
      const harness = makeHarness("supplier", {
        isVerified: verified,
        rejectionReason: reason,
      });
      await expect(
        harness.service.transitionVerification({
          profileType: "supplier",
          profileId: PROFILE_ID,
          reviewerId: REVIEWER_B,
          approve: !verified,
          rejectionReason: verified ? "Late rejection" : undefined,
        }),
      ).rejects.toBeInstanceOf(ProfileVerificationConflictError);
    },
  );

  it("allows only one winner when two reviewers race", async () => {
    const harness = makeHarness("farmer");
    const results = await Promise.allSettled([
      harness.service.transitionVerification({
        profileType: "farmer",
        profileId: PROFILE_ID,
        reviewerId: REVIEWER_A,
        approve: true,
      }),
      harness.service.transitionVerification({
        profileType: "farmer",
        profileId: PROFILE_ID,
        reviewerId: REVIEWER_B,
        approve: false,
        rejectionReason: "Second decision",
      }),
    ]);

    expect(results.filter(({ status }) => status === "fulfilled")).toHaveLength(
      1,
    );
    const rejected = results.find(({ status }) => status === "rejected");
    expect(rejected).toMatchObject({
      status: "rejected",
      reason: expect.any(ProfileVerificationConflictError),
    });
  });

  it("returns a public farm projection without KYC evidence", async () => {
    const harness = makeHarness("farmer", {
      cccdFrontFileId: "55555555-5555-4555-8555-555555555555",
      cccdBackFileId: "66666666-6666-4666-8666-666666666666",
      cccdFrontUrl: "private-front",
      cccdBackUrl: "private-back",
      farmName: "Canonical Farm",
      experienceYears: 8,
    });
    const result = await harness.service.getPublicFarmerProfile(USER_ID);

    expect(result).toMatchObject({
      farmName: "Canonical Farm",
      experienceYears: 8,
    });
    expect(result).not.toHaveProperty("cccdNumber");
    expect(result).not.toHaveProperty("cccdFrontFileId");
    expect(result).not.toHaveProperty("cccdBackFileId");
    expect(result).not.toHaveProperty("verifiedBy");
    expect(result).not.toHaveProperty("rejectionReason");
  });
});

function makeHarness(
  type: "farmer" | "cooperative" | "enterprise" | "supplier",
  overrides: Record<string, unknown> = {},
) {
  const entity = makeProfile(type, overrides);
  let current: Record<string, unknown> | null = entity;
  const repository = {
    findOne: jest.fn(async () => current),
    findOneBy: jest.fn(async () => current),
    findOneByOrFail: jest.fn(async () => {
      if (!current) throw new Error("not found");
      return current;
    }),
    update: jest.fn(async (_where, patch: Record<string, unknown>) => {
      if (!current) return { affected: 0 };
      const verifiedField = type === "farmer" ? "isKycVerified" : "isVerified";
      const restoring = patch.verifiedBy === null;
      if (
        !restoring &&
        (current[verifiedField] !== false || current.rejectionReason !== null)
      ) {
        return { affected: 0 };
      }
      current = {
        ...current,
        ...patch,
        updatedAt: new Date("2026-07-26T01:00:00Z"),
      };
      return { affected: 1 };
    }),
    count: jest.fn(),
    find: jest.fn(),
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => value),
  };
  const repositories = {
    farmer: makeUnusedRepository(),
    cooperative: makeUnusedRepository(),
    enterprise: makeUnusedRepository(),
    supplier: makeUnusedRepository(),
    [type]: repository,
  };
  const service = new ProfilesService(
    repositories.farmer as never,
    repositories.cooperative as never,
    repositories.enterprise as never,
    repositories.supplier as never,
    { verifyCccdImage: jest.fn() } as never,
    {} as never,
  );
  return { service, repository };
}

function makeProfile(
  type: "farmer" | "cooperative" | "enterprise" | "supplier",
  overrides: Record<string, unknown>,
): Record<string, unknown> {
  const base = {
    id: PROFILE_ID,
    userId: USER_ID,
    verifiedBy: null,
    rejectionReason: null,
    createdAt: new Date("2026-07-26T00:00:00Z"),
    updatedAt: new Date("2026-07-26T00:00:00Z"),
  };
  const byType = {
    farmer: {
      ...base,
      cccdNumber: "012345678901",
      cccdFrontFileId: null,
      cccdBackFileId: null,
      residenceAddress: "Can Tho",
      ward: null,
      isKycVerified: false,
      provinceId: 1,
      districtId: 2,
      bio: null,
      farmName: null,
      experienceYears: null,
      trustScore: 0,
      totalSales: 0,
      verifiedAt: null,
    },
    cooperative: {
      ...base,
      cooperativeName: "Cooperative",
      businessLicenseNumber: "LICENSE",
      taxCode: "TAX",
      representativeName: "Representative",
      representativePhone: "0900000000",
      representativeCccd: "012345678901",
      cooperativeCertFileId: null,
      businessLicenseFileId: null,
      representativeCccdFrontFileId: null,
      representativeCccdBackFileId: null,
      membersListFileId: null,
      address: "Can Tho",
      provinceId: 1,
      totalMembers: 1,
      memberCount: 1,
      isVerified: false,
      verifiedAt: null,
    },
    enterprise: {
      ...base,
      companyName: "Enterprise",
      taxCode: "TAX",
      businessLicenseFileId: null,
      representativeName: "Representative",
      representativePhone: "0900000000",
      address: "Can Tho",
      provinceId: 1,
      industry: null,
      isVerified: false,
    },
    supplier: {
      ...base,
      companyName: "Supplier",
      taxCode: null,
      address: null,
      provinceId: null,
      supplierType: "fertilizer",
      isVerified: false,
      businessLicenseFileId: null,
    },
  };
  return { ...byType[type], ...overrides };
}

function makeUnusedRepository() {
  return {
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    findOneByOrFail: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };
}
