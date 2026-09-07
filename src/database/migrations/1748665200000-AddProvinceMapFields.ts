import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddProvinceMapFields1748665200000 implements MigrationInterface {
  name = 'AddProvinceMapFields1748665200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'provinces',
      new TableColumn({
        name: 'lat',
        type: 'decimal',
        precision: 10,
        scale: 6,
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'provinces',
      new TableColumn({
        name: 'lng',
        type: 'decimal',
        precision: 10,
        scale: 6,
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'provinces',
      new TableColumn({
        name: 'slug',
        type: 'varchar',
        isNullable: true,
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('provinces', 'slug');
    await queryRunner.dropColumn('provinces', 'lng');
    await queryRunner.dropColumn('provinces', 'lat');
  }
}
