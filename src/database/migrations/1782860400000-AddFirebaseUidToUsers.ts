import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddFirebaseUidToUsers1782860400000 implements MigrationInterface {
  name = "AddFirebaseUidToUsers1782860400000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      "users",
      new TableColumn({
        name: "firebase_uid",
        type: "varchar",
        length: "128",
        isNullable: true,
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn("users", "firebase_uid");
  }
}
