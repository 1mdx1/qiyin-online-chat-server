import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * 补充 group 表缺失的 name 列（早期 group 迁移未创建该列）
 */
export class GroupName1786800000000 implements MigrationInterface {
  name = 'GroupName1786800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn('group', 'name'))) {
      await queryRunner.addColumn(
        'group',
        new TableColumn({
          name: 'name',
          type: 'varchar',
          isNullable: true,
        })
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn('group', 'name')) {
      await queryRunner.dropColumn('group', 'name');
    }
  }
}
