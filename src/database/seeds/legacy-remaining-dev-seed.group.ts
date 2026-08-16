import {
  EMPTY_SEED_GROUP_RESULT,
  SeedClassification,
  SeedExecutionContext,
  SeedGroup,
  SeedGroupMetadata,
  SeedGroupResult,
} from "./framework/seed-contract";
import {
  USER_ID_BY_EMAIL_OUTPUT_KIND,
  USERS_DEV_SEED_GROUP_ID,
} from "../../modules/users/application/contracts/user-seed-output.contract";
import { PRODUCTS_DEV_SEED_GROUP_ID } from "../../modules/products/application/contracts/product-seed-output.contract";

export const LEGACY_REMAINING_DEV_SEED_GROUP_ID = "legacy.dev.remaining";
export const TEMPORARY_LEGACY_CONTINUATION = "YES";
export const LEGACY_REMAINING_TARGET_RETIREMENT = "P8_05C4";

export const LEGACY_DEV_ACTOR_EMAILS = Object.freeze({
  ADMIN: "admin@agrilink.vn",
  FARMER: "farmer@sandbox.com",
  BUYER: "buyer@agrilink.vn",
  ENTERPRISE: "enterprise@agrilink.vn",
  SUPPLIER: "supplier@agrilink.vn",
  LOGISTICS: "logistics@agrilink.vn",
  COOP: "cooperative@sandbox.com",
  STATE_AGENCY: "state_agency@sandbox.com",
});

export type LegacyDevActorAlias = keyof typeof LEGACY_DEV_ACTOR_EMAILS;
export type LegacyDevActorIds = Readonly<Record<LegacyDevActorAlias, string>>;

export interface LegacyRemainingDevSeedContinuation {
  seedRemainingLegacySections(actors: LegacyDevActorIds): Promise<void>;
}

export const LEGACY_REMAINING_DEV_SEED_METADATA: SeedGroupMetadata = {
  id: LEGACY_REMAINING_DEV_SEED_GROUP_ID,
  owner: "persistence-transition",
  classification: SeedClassification.DEV,
  dependencies: [USERS_DEV_SEED_GROUP_ID, PRODUCTS_DEV_SEED_GROUP_ID],
  description: "TEMPORARY_LEGACY_CONTINUATION=YES; TARGET_RETIREMENT=P8_05C4",
};

export function resolveLegacyDevActorIds(
  context: SeedExecutionContext,
): LegacyDevActorIds {
  return Object.fromEntries(
    Object.entries(LEGACY_DEV_ACTOR_EMAILS).map(([alias, email]) => [
      alias,
      context.dependencies.requireString(
        USERS_DEV_SEED_GROUP_ID,
        USER_ID_BY_EMAIL_OUTPUT_KIND,
        email,
      ),
    ]),
  ) as unknown as LegacyDevActorIds;
}

/**
 * Temporary dependency-scoped bridge for still-unmigrated C2/C3/C4 writes.
 * It intentionally exposes one narrow continuation method and no registry,
 * Users repository, entity, or migrated C1 method.
 */
export class LegacyRemainingDevSeedGroup implements SeedGroup {
  readonly metadata = LEGACY_REMAINING_DEV_SEED_METADATA;

  constructor(
    private readonly continuation: LegacyRemainingDevSeedContinuation,
  ) {}

  async execute(context: SeedExecutionContext): Promise<SeedGroupResult> {
    if (!context.classifications.includes(SeedClassification.DEV)) {
      throw new Error(`${this.metadata.id} requires explicit DEV selection`);
    }
    await this.continuation.seedRemainingLegacySections(
      resolveLegacyDevActorIds(context),
    );
    return EMPTY_SEED_GROUP_RESULT;
  }
}
