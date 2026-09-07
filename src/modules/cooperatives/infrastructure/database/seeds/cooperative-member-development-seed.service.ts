import { Inject, Injectable } from "@nestjs/common";

import {
  EMPTY_SEED_GROUP_RESULT,
  SeedClassification,
  SeedExecutionContext,
  SeedGroup,
  SeedGroupMetadata,
  SeedGroupResult,
} from "../../../../../database/seeds/framework/seed-contract";
import {
  USER_ID_BY_EMAIL_OUTPUT_KIND,
  USERS_DEV_SEED_GROUP_ID,
} from "../../../../users/application/contracts/user-seed-output.contract";
import { COOPERATIVES_DEV_MEMBERS_SEED_GROUP_ID } from "../../../application/contracts/cooperative-seed.contract";
import { CooperativeMemberStatus } from "../../../domain/models/cooperative-persistence.models";

export const COOPERATIVE_MEMBER_DEV_SEED_WRITER = Symbol(
  "COOPERATIVE_MEMBER_DEV_SEED_WRITER",
);

export const COOPERATIVES_DEV_MEMBERS_SEED_METADATA: SeedGroupMetadata = {
  id: COOPERATIVES_DEV_MEMBERS_SEED_GROUP_ID,
  owner: "cooperatives",
  classification: SeedClassification.DEV,
  dependencies: [USERS_DEV_SEED_GROUP_ID],
  description: "Canonical Cooperative Member development fixture",
};

export interface CooperativeMemberDevSeedDefinition {
  readonly fixtureId: string;
  readonly cooperativeEmail: string;
  readonly farmerEmail: string;
  readonly status: CooperativeMemberStatus;
  readonly role: string | null;
}

export interface CooperativeMemberDevSeedWriteData {
  readonly cooperativeId: string;
  readonly farmerId: string;
  readonly status: CooperativeMemberStatus;
  readonly role: string | null;
}

export interface CooperativeMemberDevSeedCreateData extends CooperativeMemberDevSeedWriteData {
  readonly joinedAt: Date;
}

export interface CooperativeMemberDevSeedUpdateData {
  readonly status: CooperativeMemberStatus;
  readonly role: string | null;
}

export interface CooperativeMemberDevSeedRecord {
  readonly id: string;
  readonly joinedAt: Date | null;
}

export interface CooperativeMemberDevSeedWriter {
  findMembersByCooperativeAndFarmer(
    cooperativeId: string,
    farmerId: string,
  ): Promise<readonly CooperativeMemberDevSeedRecord[]>;
  createMember(data: CooperativeMemberDevSeedCreateData): Promise<void>;
  updateMember(
    id: string,
    data: CooperativeMemberDevSeedUpdateData,
  ): Promise<void>;
}

export const COOPERATIVE_MEMBER_DEV_SEED_DEFINITIONS: readonly CooperativeMemberDevSeedDefinition[] =
  Object.freeze([
    {
      fixtureId: "COOP-MEMBER-01",
      cooperativeEmail: "cooperative@sandbox.com",
      farmerEmail: "farmer@sandbox.com",
      status: "active",
      role: "Thành viên sản xuất",
    },
  ]);

export function resolveCooperativeMemberDevelopmentSeedData(
  context: SeedExecutionContext,
  definitions: readonly CooperativeMemberDevSeedDefinition[] = COOPERATIVE_MEMBER_DEV_SEED_DEFINITIONS,
): readonly CooperativeMemberDevSeedWriteData[] {
  const declaredIdentities = new Set<string>();

  return definitions.map((definition) => {
    const declaredIdentity = `${definition.cooperativeEmail}\u0000${definition.farmerEmail}`;
    if (declaredIdentities.has(declaredIdentity)) {
      throw new Error(
        `${COOPERATIVES_DEV_MEMBERS_SEED_GROUP_ID} declares duplicate Member identity ${definition.cooperativeEmail}/${definition.farmerEmail}`,
      );
    }
    declaredIdentities.add(declaredIdentity);

    return {
      cooperativeId: context.dependencies.requireString(
        USERS_DEV_SEED_GROUP_ID,
        USER_ID_BY_EMAIL_OUTPUT_KIND,
        definition.cooperativeEmail,
      ),
      farmerId: context.dependencies.requireString(
        USERS_DEV_SEED_GROUP_ID,
        USER_ID_BY_EMAIL_OUTPUT_KIND,
        definition.farmerEmail,
      ),
      status: definition.status,
      role: definition.role,
    };
  });
}

export async function reconcileCooperativeMemberDevelopmentSeeds(
  writer: CooperativeMemberDevSeedWriter,
  records: readonly CooperativeMemberDevSeedWriteData[],
  now: () => Date = () => new Date(),
): Promise<void> {
  const resolvedIdentities = new Set<string>();
  const preflight: Array<{
    readonly matches: readonly CooperativeMemberDevSeedRecord[];
    readonly data: CooperativeMemberDevSeedWriteData;
  }> = [];

  for (const data of records) {
    const identity = `${data.cooperativeId}\u0000${data.farmerId}`;
    if (resolvedIdentities.has(identity)) {
      throw new Error(
        `${COOPERATIVES_DEV_MEMBERS_SEED_GROUP_ID} resolves duplicate Member identity ${data.cooperativeId}/${data.farmerId}`,
      );
    }
    resolvedIdentities.add(identity);

    const matches = await writer.findMembersByCooperativeAndFarmer(
      data.cooperativeId,
      data.farmerId,
    );
    if (matches.length > 1) {
      throw new Error(
        `${COOPERATIVES_DEV_MEMBERS_SEED_GROUP_ID} found multiple Members for cooperative ${data.cooperativeId} and Farmer ${data.farmerId}`,
      );
    }
    preflight.push({ matches, data });
  }

  for (const { matches, data } of preflight) {
    if (matches.length === 1) {
      await writer.updateMember(matches[0].id, {
        status: data.status,
        role: data.role,
      });
    } else {
      await writer.createMember({ ...data, joinedAt: now() });
    }
  }
}

@Injectable()
export class CooperativeMemberDevelopmentSeedService implements SeedGroup {
  readonly metadata = COOPERATIVES_DEV_MEMBERS_SEED_METADATA;

  constructor(
    @Inject(COOPERATIVE_MEMBER_DEV_SEED_WRITER)
    private readonly writer: CooperativeMemberDevSeedWriter,
  ) {}

  async execute(context: SeedExecutionContext): Promise<SeedGroupResult> {
    if (!context.classifications.includes(SeedClassification.DEV)) {
      throw new Error(`${this.metadata.id} requires explicit DEV selection`);
    }

    await reconcileCooperativeMemberDevelopmentSeeds(
      this.writer,
      resolveCooperativeMemberDevelopmentSeedData(context),
    );
    return EMPTY_SEED_GROUP_RESULT;
  }
}
