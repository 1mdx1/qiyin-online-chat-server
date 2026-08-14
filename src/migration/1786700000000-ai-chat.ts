import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableIndex,
} from 'typeorm';

export class AiChat1786700000000 implements MigrationInterface {
  name = 'AiChat1786700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // user: 机器人性格字段
    if (!(await queryRunner.hasColumn('user', 'personality'))) {
      await queryRunner.addColumn(
        'user',
        new TableColumn({
          name: 'personality',
          type: 'varchar',
          isNullable: true,
        })
      );
    }

    // group: 群组名称（早期迁移缺失，幂等补充）
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
    // group: 创建者字段（幂等，避免早期版本未包含该列）
    if (!(await queryRunner.hasColumn('group', 'uid'))) {
      await queryRunner.addColumn(
        'group',
        new TableColumn({
          name: 'uid',
          type: 'varchar',
          isNullable: true,
        })
      );
    }
    // group: 机器人回复策略
    if (!(await queryRunner.hasColumn('group', 'strategy'))) {
      await queryRunner.addColumn(
        'group',
        new TableColumn({
          name: 'strategy',
          type: 'varchar',
          default: "'content'",
        })
      );
    }
    // group: 机器人连续回复上限（防循环）
    if (!(await queryRunner.hasColumn('group', 'maxRobotReplies'))) {
      await queryRunner.addColumn(
        'group',
        new TableColumn({
          name: 'maxRobotReplies',
          type: 'smallint',
          default: 3,
        })
      );
    }

    // message: 发送者字段（幂等）
    if (!(await queryRunner.hasColumn('message', 'uid'))) {
      await queryRunner.addColumn(
        'message',
        new TableColumn({
          name: 'uid',
          type: 'varchar',
          isNullable: true,
        })
      );
    }
    // message: 个人对话会话字段（早期迁移缺失，幂等补充）
    if (!(await queryRunner.hasColumn('message', 'cid'))) {
      await queryRunner.addColumn(
        'message',
        new TableColumn({
          name: 'cid',
          type: 'varchar',
          isNullable: true,
        })
      );
    }
    // message: 消息状态（AI 失败标记）
    if (!(await queryRunner.hasColumn('message', 'status'))) {
      await queryRunner.addColumn(
        'message',
        new TableColumn({
          name: 'status',
          type: 'smallint',
          default: 0,
        })
      );
    }

    // 性能索引：群组消息与个人对话消息按时间顺序查询
    const msgTable = await queryRunner.getTable('message');
    if (
      msgTable &&
      !msgTable.indices.some(i => i.name === 'IDX_message_gid_createdAt')
    ) {
      await queryRunner.createIndex(
        'message',
        new TableIndex({
          name: 'IDX_message_gid_createdAt',
          columnNames: ['gid', 'createdAt'],
        })
      );
    }
    if (
      msgTable &&
      !msgTable.indices.some(i => i.name === 'IDX_message_cid_createdAt')
    ) {
      await queryRunner.createIndex(
        'message',
        new TableIndex({
          name: 'IDX_message_cid_createdAt',
          columnNames: ['cid', 'createdAt'],
        })
      );
    }
    // 个人对话按用户查询索引
    const convTable = await queryRunner.getTable('conversation');
    if (
      convTable &&
      !convTable.indices.some(i => i.name === 'IDX_conversation_uid')
    ) {
      await queryRunner.createIndex(
        'conversation',
        new TableIndex({
          name: 'IDX_conversation_uid',
          columnNames: ['uid'],
        })
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn('user', 'personality')) {
      await queryRunner.dropColumn('user', 'personality');
    }
    if (await queryRunner.hasColumn('group', 'strategy')) {
      await queryRunner.dropColumn('group', 'strategy');
    }
    if (await queryRunner.hasColumn('group', 'maxRobotReplies')) {
      await queryRunner.dropColumn('group', 'maxRobotReplies');
    }
    if (await queryRunner.hasColumn('message', 'status')) {
      await queryRunner.dropColumn('message', 'status');
    }
    const msgTable = await queryRunner.getTable('message');
    if (msgTable?.indices.some(i => i.name === 'IDX_message_gid_createdAt')) {
      await queryRunner.dropIndex('message', 'IDX_message_gid_createdAt');
    }
    if (msgTable?.indices.some(i => i.name === 'IDX_message_cid_createdAt')) {
      await queryRunner.dropIndex('message', 'IDX_message_cid_createdAt');
    }
    const convTable = await queryRunner.getTable('conversation');
    if (convTable?.indices.some(i => i.name === 'IDX_conversation_uid')) {
      await queryRunner.dropIndex('conversation', 'IDX_conversation_uid');
    }
  }
}
