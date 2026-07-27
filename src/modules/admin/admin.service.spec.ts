import { UserRole } from "@common/enums";
import { AdminService } from "./admin.service";

const ADMIN_ID = "11111111-1111-4111-8111-111111111111";
const PROFILE_ID = "22222222-2222-4222-8222-222222222222";
const FRONT_FILE_ID = "33333333-3333-4333-8333-333333333333";
const BACK_FILE_ID = "44444444-4444-4444-8444-444444444444";

describe("AdminService profile review consistency", () => {
  it("restores changed files and the conditional profile transition when review fails", async () => {
    const auditRepository = {
      create: jest.fn((value) => value),
      upsert: jest.fn(),
    };
    const transition = {
      profileType: "farmer" as const,
      profileId: PROFILE_ID,
      reviewerId: ADMIN_ID,
      beforeStatus: "pending" as const,
      afterStatus: "approved" as const,
      rejectionReason: null,
      transitionedAt: new Date("2026-07-26T00:00:00Z"),
      documentReferences: [
        { fileId: FRONT_FILE_ID, assetType: "KYC_IDENTITY" as const },
        { fileId: BACK_FILE_ID, assetType: "KYC_IDENTITY" as const },
      ],
      profile: { id: PROFILE_ID },
    };
    const profileManager = {
      transitionVerification: jest.fn().mockResolvedValue(transition),
      restorePendingVerification: jest.fn().mockResolvedValue(true),
    };
    const storedFileAccess = {
      reviewFile: jest
        .fn()
        .mockResolvedValueOnce(true)
        .mockRejectedValueOnce(new Error("storage unavailable")),
      restoreReviewedFile: jest.fn().mockResolvedValue(undefined),
    };
    const service = new AdminService(
      {} as never,
      auditRepository as never,
      {} as never,
      profileManager as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      storedFileAccess as never,
    );

    await expect(
      service.verifyProfile(
        "farmer",
        PROFILE_ID,
        { isApproved: true },
        ADMIN_ID,
        UserRole.STATE_AGENCY,
      ),
    ).rejects.toThrow("storage unavailable");

    expect(storedFileAccess.restoreReviewedFile).toHaveBeenCalledWith({
      fileId: FRONT_FILE_ID,
      reviewerRole: UserRole.STATE_AGENCY,
    });
    expect(profileManager.restorePendingVerification).toHaveBeenCalledWith(
      transition,
    );
    expect(auditRepository.upsert).not.toHaveBeenCalled();
  });
});
