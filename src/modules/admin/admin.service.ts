import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { createHash } from "crypto";
import { Repository } from "typeorm";
import { SystemConfig } from "./entities/system-config.entity";
import { AuditLog } from "./entities/audit-log.entity";
import { PaginationDto } from "../../common/dto/pagination.dto";
import { VerifyProfileDto } from "./dto/verify-profile.dto";
import { IncidentReport } from "../../database/entities/incident-report.entity";
import { UserRole, UserStatus } from "../../common/enums";
import {
  PRODUCT_ADMIN_READER,
  PRODUCT_MODERATION_MANAGER,
  ProductAdminReader,
  ProductModerationManager,
} from "../products/application/ports/inbound/product-admin.port";
import { ProductModel } from "../products/application/models/product.model";
import {
  STORED_FILE_ACCESS,
  StorageReviewerRole,
  StoredFileAccessPort,
} from "../storage/application/ports/inbound/stored-file-access.port";
import {
  USER_ADMIN_READER,
  USER_STATUS_MANAGER,
  UserAdminReader,
  UserStatusManager,
} from "../users/application/ports/user-admin.port";
import {
  AUTH_SESSION_REVOCATION,
  AuthSessionRevocationPort,
} from "../auth/application/ports/inbound/auth-session-revocation.port";
import {
  PROFILE_VERIFICATION_MANAGER,
  PROFILE_VERIFICATION_READER,
  ProfileVerificationManager,
  ProfileVerificationReader,
  ProfileVerificationTransition,
} from "../profiles/application/ports/inbound/profile-verification.port";
import {
  InvalidProfileTypeError,
  ProfileNotFoundError,
  ProfileRejectionReasonRequiredError,
  ProfileVerificationConflictError,
} from "../profiles/application/errors/profile-verification.errors";
import { UserSummary } from "../users/domain/models/user-account";

class ProfileReviewConsistencyError extends Error {}

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(SystemConfig)
    private readonly configRepo: Repository<SystemConfig>,
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
    @Inject(PROFILE_VERIFICATION_READER)
    private readonly profileVerificationReader: ProfileVerificationReader,
    @Inject(PROFILE_VERIFICATION_MANAGER)
    private readonly profileVerificationManager: ProfileVerificationManager,
    @Inject(USER_ADMIN_READER)
    private readonly userAdminReader: UserAdminReader,
    @Inject(USER_STATUS_MANAGER)
    private readonly userStatusManager: UserStatusManager,
    @Inject(AUTH_SESSION_REVOCATION)
    private readonly authSessionRevocation: AuthSessionRevocationPort,
    @Inject(PRODUCT_ADMIN_READER)
    private readonly productAdminReader: ProductAdminReader,
    @Inject(PRODUCT_MODERATION_MANAGER)
    private readonly productModerationManager: ProductModerationManager,
    @InjectRepository(IncidentReport)
    private readonly incidentRepo: Repository<IncidentReport>,
    @Inject(STORED_FILE_ACCESS)
    private readonly storedFileAccess: StoredFileAccessPort,
  ) {}

  async getStats() {
    const [
      totalUsers,
      activeUsers,
      profileStats,
      totalProducts,
      pendingProducts,
      openDisputes,
    ] = await Promise.all([
      this.userAdminReader.countAll(),
      this.userAdminReader.countByStatus(UserStatus.ACTIVE),
      this.profileVerificationReader.getVerificationStats(
        new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      ),
      this.productAdminReader.countAll(),
      this.productAdminReader.countPending(),
      this.incidentRepo.count({ where: { status: "open" } }),
    ]);

    return {
      totalUsers,
      activeUsers,
      pendingProfiles: {
        farmer: profileStats.farmer,
        cooperative: profileStats.cooperative,
        enterprise: profileStats.enterprise,
        supplier: profileStats.supplier,
        total: profileStats.total,
      },
      totalProducts,
      pendingProducts,
      openDisputes,
      certificationsThisMonth: profileStats.certificationsThisMonth,
    };
  }

  async getPendingProfiles() {
    const queues =
      await this.profileVerificationReader.listPendingVerificationProfiles();
    const userById = await this.loadProfileUsers([
      ...queues.farmer,
      ...queues.cooperative,
      ...queues.enterprise,
      ...queues.supplier,
    ]);

    return {
      farmer: this.attachProfileUsers(queues.farmer, userById),
      cooperative: this.attachProfileUsers(queues.cooperative, userById),
      enterprise: this.attachProfileUsers(queues.enterprise, userById),
      supplier: this.attachProfileUsers(queues.supplier, userById),
    };
  }

  async verifyProfile(
    type: string,
    profileId: string,
    dto: VerifyProfileDto,
    adminId: string,
    reviewerRole: StorageReviewerRole,
  ) {
    let transition: ProfileVerificationTransition;
    try {
      transition = await this.profileVerificationManager.transitionVerification(
        {
          profileType: this.toProfileType(type),
          profileId,
          reviewerId: adminId,
          approve: dto.isApproved,
          rejectionReason: dto.rejectionReason,
        },
      );
    } catch (error) {
      this.rethrowProfileVerificationError(error);
    }

    const transitionedFileIds: string[] = [];
    try {
      for (const { fileId } of transition.documentReferences) {
        const changed = await this.storedFileAccess.reviewFile({
          fileId,
          reviewerRole,
          approve: dto.isApproved,
        });
        if (changed) transitionedFileIds.push(fileId);
      }
    } catch (error) {
      const storageCompensation = await Promise.allSettled(
        transitionedFileIds.map((fileId) =>
          this.storedFileAccess.restoreReviewedFile({
            fileId,
            reviewerRole,
          }),
        ),
      );
      const profileRestored =
        await this.profileVerificationManager.restorePendingVerification(
          transition,
        );
      if (
        !profileRestored ||
        storageCompensation.some((result) => result.status === "rejected")
      ) {
        throw new ProfileReviewConsistencyError(
          "Profile review compensation failed and requires reconciliation",
        );
      }
      throw error;
    }

    await this.writeVerificationAudit(transition);

    return { success: true, profile: transition.profile };
  }

  private toProfileType(type: string) {
    if (
      type === "farmer" ||
      type === "cooperative" ||
      type === "enterprise" ||
      type === "supplier"
    ) {
      return type;
    }
    throw new BadRequestException("Invalid profile type");
  }

  private rethrowProfileVerificationError(error: unknown): never {
    if (
      error instanceof InvalidProfileTypeError ||
      error instanceof ProfileRejectionReasonRequiredError
    ) {
      throw new BadRequestException(error.message);
    }
    if (error instanceof ProfileNotFoundError) {
      throw new NotFoundException(error.message);
    }
    if (error instanceof ProfileVerificationConflictError) {
      throw new ConflictException(error.message);
    }
    throw error;
  }

  private async writeVerificationAudit(
    transition: ProfileVerificationTransition,
  ): Promise<void> {
    const id = this.verificationAuditId(transition);
    const audit = this.auditRepo.create({
      id,
      userId: transition.reviewerId,
      action:
        transition.afterStatus === "approved"
          ? "PROFILE_APPROVED"
          : "PROFILE_REJECTED",
      entityType: transition.profileType,
      entityId: transition.profileId,
      changes: {
        beforeStatus: transition.beforeStatus,
        afterStatus: transition.afterStatus,
        rejectionReason: transition.rejectionReason,
        transitionedAt: transition.transitionedAt.toISOString(),
      },
    });

    let lastError: unknown;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        await this.auditRepo.upsert(audit, ["id"]);
        return;
      } catch (error) {
        lastError = error;
      }
    }
    throw new ProfileReviewConsistencyError(
      `Profile status committed but idempotent audit retry failed: ${
        lastError instanceof Error ? lastError.name : "unknown error"
      }`,
    );
  }

  private verificationAuditId(
    transition: ProfileVerificationTransition,
  ): string {
    const value = [
      transition.profileType,
      transition.profileId,
      transition.afterStatus,
      transition.reviewerId,
      transition.transitionedAt.toISOString(),
    ].join(":");
    const hex = createHash("sha256").update(value).digest("hex").slice(0, 32);
    return [
      hex.slice(0, 8),
      hex.slice(8, 12),
      hex.slice(12, 16),
      hex.slice(16, 20),
      hex.slice(20),
    ].join("-");
  }

  async getSystemConfigs(): Promise<SystemConfig[]> {
    return this.configRepo.find({ order: { key: "ASC" } });
  }

  async updateSystemConfig(
    key: string,
    value: string,
    updatedBy: string,
  ): Promise<SystemConfig> {
    let config = await this.configRepo.findOne({ where: { key } });
    if (!config) {
      config = this.configRepo.create({ key, value, updatedBy });
    } else {
      config.value = value;
      config.updatedBy = updatedBy;
    }
    const saved = await this.configRepo.save(config);
    await this.createAuditLog({
      userId: updatedBy,
      action: "SYSTEM_CONFIG_UPDATE",
      entityType: "SystemConfig",
      entityId: saved.id,
      changes: { key, value },
    });
    return saved;
  }

  async getAuditLogs(
    pagination: PaginationDto,
  ): Promise<{ data: AuditLog[]; total: number }> {
    const [data, total] = await this.auditRepo.findAndCount({
      order: { createdAt: "DESC" },
      skip: pagination.skip,
      take: pagination.limit ?? 20,
    });
    return { data, total };
  }

  async getDisputes(
    pagination: PaginationDto,
    status?: string,
  ): Promise<{ data: IncidentReport[]; total: number }> {
    const qb = this.incidentRepo
      .createQueryBuilder("ir")
      .orderBy("ir.created_at", "DESC");
    if (status) qb.where("ir.status = :status", { status });
    qb.skip(pagination.skip).take(pagination.limit ?? 20);
    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async updateDisputeStatus(
    id: string,
    status: string,
    adminId: string,
  ): Promise<IncidentReport> {
    const report = await this.incidentRepo.findOne({ where: { id } });
    if (!report) throw new NotFoundException("Incident report not found");
    report.status = status;
    if (status === "resolved") report.resolvedAt = new Date();
    const saved = await this.incidentRepo.save(report);
    await this.createAuditLog({
      userId: adminId,
      action: "DISPUTE_STATUS_UPDATE",
      entityType: "IncidentReport",
      entityId: id,
      changes: { status },
    });
    return saved;
  }

  async getProductDetail(id: string) {
    const product = await this.productAdminReader.findDetail(id);
    if (!product) throw new NotFoundException("Product not found");
    const sellers = await this.userAdminReader.findSummariesByIds([
      product.sellerId,
    ]);
    return {
      ...product,
      seller: sellers[0] ? { fullName: sellers[0].fullName } : null,
    };
  }

  async getPendingProducts(pagination: PaginationDto) {
    const { data, total } = await this.productAdminReader.listPending(
      pagination.skip,
      pagination.limit ?? 20,
    );
    return { data: await this.attachSellers(data), total };
  }

  async updateProductStatus(
    id: string,
    status: string,
    reason: string,
    adminId: string,
  ) {
    const transition = await this.productModerationManager.moderate(
      id,
      status,
      reason ?? null,
    );
    if (transition.outcome === "invalid-target") {
      throw new BadRequestException(
        "Invalid status. Allowed: active, rejected, suspended",
      );
    }
    if (transition.outcome === "not-found") {
      throw new NotFoundException("Product not found");
    }
    if (transition.outcome === "conflict") {
      throw new ConflictException(
        "Product status changed while it was being reviewed",
      );
    }

    await this.createAuditLog({
      userId: adminId,
      action: "PRODUCT_STATUS_UPDATE",
      entityType: "Product",
      entityId: id,
      changes: {
        previousStatus: transition.previousStatus,
        status: transition.product.status,
        reason,
      },
    });

    return transition.product;
  }

  /** Products suspended/rejected for policy violations — state agency oversight view */
  async getViolatingProducts(pagination: PaginationDto) {
    const { data, total } = await this.productAdminReader.listViolating(
      pagination.skip,
      pagination.limit ?? 20,
    );
    return { data: await this.attachSellers(data), total };
  }

  private async attachSellers(products: ProductModel[]) {
    const sellerIds = [...new Set(products.map((p) => p.sellerId))];
    if (sellerIds.length === 0) return products;

    const sellers = await this.userAdminReader.findSummariesByIds(sellerIds);
    const sellerById = new Map(sellers.map((s) => [s.id, s]));

    return products.map((p) => ({
      ...p,
      seller: sellerById.get(p.sellerId)
        ? { fullName: sellerById.get(p.sellerId)!.fullName }
        : null,
    }));
  }

  // ─── User management ──────────────────────────────────────────────

  async getUsers(pagination: PaginationDto) {
    return this.userAdminReader.list(pagination.skip, pagination.limit ?? 20);
  }

  async toggleUserStatus(id: string, adminId: string, status: UserStatus) {
    const result = await this.userStatusManager.changeStatus(id, status);
    if (result.outcome === "not-found") {
      throw new NotFoundException("User not found");
    }
    if (result.outcome === "protected-admin") {
      throw new BadRequestException("Cannot modify admin users");
    }

    if (status !== UserStatus.ACTIVE) {
      await this.authSessionRevocation.revokeAllForUser(id);
    }

    if (result.previousStatus !== status) {
      await this.createAuditLog({
        userId: adminId,
        action: status === UserStatus.ACTIVE ? "USER_UNLOCKED" : "USER_LOCKED",
        entityType: "User",
        entityId: id,
        changes: { previousStatus: result.previousStatus, status },
      });
    }

    return result.account;
  }

  /** All verified cooperatives and enterprises — state agency oversight list */
  async getCooperativesAndEnterprises() {
    const organizations =
      await this.profileVerificationReader.listOrganizations();
    const userById = await this.loadProfileUsers([
      ...organizations.cooperatives,
      ...organizations.enterprises,
    ]);
    return {
      cooperatives: this.attachProfileUsers(
        organizations.cooperatives,
        userById,
      ),
      enterprises: this.attachProfileUsers(organizations.enterprises, userById),
    };
  }

  private async loadProfileUsers<T extends { userId: string | null }>(
    profiles: T[],
  ): Promise<Map<string, UserSummary>> {
    const userIds = [
      ...new Set(
        profiles
          .map(({ userId }) => userId)
          .filter((userId): userId is string => !!userId),
      ),
    ];
    const users =
      userIds.length > 0
        ? await this.userAdminReader.findSummariesByIds(userIds)
        : [];
    return new Map(users.map((user) => [user.id, user]));
  }

  private attachProfileUsers<T extends { userId: string | null }>(
    profiles: T[],
    userById: Map<string, UserSummary>,
  ): Array<T & { user: UserSummary | null }> {
    return profiles.map((profile) => ({
      ...profile,
      user: profile.userId ? (userById.get(profile.userId) ?? null) : null,
    }));
  }

  async createAuditLog(data: Partial<AuditLog>): Promise<AuditLog> {
    return this.auditRepo.save(this.auditRepo.create(data));
  }

  /** Snapshot of system-wide data for the state-agency PDF report */
  async getSystemReportData() {
    const pagination = new PaginationDto();
    pagination.limit = 20;
    const [stats, cooperativesEnterprises, violatingProducts] =
      await Promise.all([
        this.getStats(),
        this.getCooperativesAndEnterprises(),
        this.getViolatingProducts(pagination),
      ]);
    return {
      stats,
      cooperativesEnterprises,
      violatingProducts,
      generatedAt: new Date(),
    };
  }
}
