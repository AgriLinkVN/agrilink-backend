import { UserRole } from "../../src/common/enums";
import { AdminService } from "../../src/modules/admin/admin.service";
import { ProfileVerificationConflictError } from "../../src/modules/profiles/application/errors/profile-verification.errors";

const REVIEWER_ID = "11111111-1111-4111-8111-111111111111";
const PROFILE_ID = "22222222-2222-4222-8222-222222222222";
const USER_IDS = [
  "33333333-3333-4333-8333-333333333333",
  "44444444-4444-4444-8444-444444444444",
  "55555555-5555-4555-8555-555555555555",
  "66666666-6666-4666-8666-666666666666",
];

describe("Persistence Phase 4 Admin read model", () => {
  it("batches Users lookup once for all four pending queues", async () => {
    const queues = {
      farmer: [{ id: "f", userId: USER_IDS[0] }],
      cooperative: [{ id: "c", userId: USER_IDS[1] }],
      enterprise: [{ id: "e", userId: USER_IDS[2] }],
      supplier: [{ id: "s", userId: USER_IDS[3] }],
    };
    const profileReader = {
      listPendingVerificationProfiles: jest.fn().mockResolvedValue(queues),
    };
    const userReader = {
      findSummariesByIds: jest
        .fn()
        .mockResolvedValue(
          USER_IDS.map((id, index) => ({ id, fullName: `User ${index}` })),
        ),
    };
    const service = makeService({ profileReader, userReader });

    const result = await service.getPendingProfiles();

    expect(userReader.findSummariesByIds).toHaveBeenCalledTimes(1);
    expect(userReader.findSummariesByIds).toHaveBeenCalledWith(USER_IDS);
    expect(result.supplier[0]).toMatchObject({
      id: "s",
      userId: USER_IDS[3],
      user: { id: USER_IDS[3], fullName: "User 3" },
    });
    expect(queues.supplier[0]).not.toHaveProperty("user");
  });

  it("writes a typed idempotent audit after profile and Storage success", async () => {
    const transition = {
      profileType: "supplier" as const,
      profileId: PROFILE_ID,
      reviewerId: REVIEWER_ID,
      beforeStatus: "pending" as const,
      afterStatus: "approved" as const,
      rejectionReason: null,
      transitionedAt: new Date("2026-07-26T00:00:00Z"),
      documentReferences: [
        {
          fileId: "77777777-7777-4777-8777-777777777777",
          assetType: "BUSINESS_LICENSE" as const,
        },
      ],
      profile: { id: PROFILE_ID, userId: USER_IDS[3] },
    };
    const profileManager = {
      transitionVerification: jest.fn().mockResolvedValue(transition),
    };
    const auditRepository = {
      create: jest.fn((value) => value),
      upsert: jest
        .fn()
        .mockRejectedValueOnce(new Error("transient"))
        .mockResolvedValue(undefined),
    };
    const storage = { reviewFile: jest.fn().mockResolvedValue(true) };
    const service = makeService({
      profileManager,
      auditRepository,
      storage,
    });

    await expect(
      service.verifyProfile(
        "supplier",
        PROFILE_ID,
        { isApproved: true },
        REVIEWER_ID,
        UserRole.ADMIN,
      ),
    ).resolves.toEqual({ success: true, profile: transition.profile });

    expect(storage.reviewFile).toHaveBeenCalledWith({
      fileId: transition.documentReferences[0].fileId,
      reviewerRole: UserRole.ADMIN,
      approve: true,
    });
    expect(auditRepository.upsert).toHaveBeenCalledTimes(2);
    const audit = auditRepository.create.mock.calls[0][0];
    expect(audit).toMatchObject({
      id: expect.stringMatching(/^[0-9a-f-]{36}$/),
      action: "PROFILE_APPROVED",
      entityType: "supplier",
      entityId: PROFILE_ID,
      changes: {
        beforeStatus: "pending",
        afterStatus: "approved",
        rejectionReason: null,
      },
    });
    expect(JSON.stringify(audit)).not.toContain(
      transition.documentReferences[0].fileId,
    );
  });

  it("maps a stale reviewer transition to HTTP conflict", async () => {
    const service = makeService({
      profileManager: {
        transitionVerification: jest
          .fn()
          .mockRejectedValue(
            new ProfileVerificationConflictError(
              "Profile is no longer pending",
            ),
          ),
      },
    });

    await expect(
      service.verifyProfile(
        "farmer",
        PROFILE_ID,
        { isApproved: true },
        REVIEWER_ID,
        UserRole.ADMIN,
      ),
    ).rejects.toMatchObject({ status: 409 });
  });
});

function makeService(overrides: {
  profileReader?: object;
  profileManager?: object;
  userReader?: object;
  auditRepository?: object;
  storage?: object;
}) {
  return new AdminService(
    {} as never,
    (overrides.auditRepository ?? {}) as never,
    (overrides.profileReader ?? {}) as never,
    (overrides.profileManager ?? {}) as never,
    (overrides.userReader ?? {}) as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    (overrides.storage ?? {}) as never,
  );
}
