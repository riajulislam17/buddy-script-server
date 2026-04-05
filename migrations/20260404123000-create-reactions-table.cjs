'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableName = 'reactions';
    const allTables = await queryInterface.showAllTables();
    const tableExists = allTables
      .map((table) => (typeof table === 'string' ? table : table.tableName))
      .includes(tableName);

    if (!tableExists) {
      await queryInterface.createTable(tableName, {
        id: {
          type: Sequelize.BIGINT,
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        userId: {
          type: Sequelize.BIGINT,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        targetType: {
          type: Sequelize.STRING(20),
          allowNull: false,
        },
        targetId: {
          type: Sequelize.BIGINT,
          allowNull: false,
        },
        reactionType: {
          type: Sequelize.STRING(20),
          allowNull: false,
          defaultValue: 'like',
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW'),
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW'),
        },
      });
    }

    const table = await queryInterface.describeTable(tableName);

    if (!table.reactionType) {
      await queryInterface.addColumn(tableName, 'reactionType', {
        type: Sequelize.STRING(20),
        allowNull: true,
        defaultValue: 'like',
      });
    }

    await queryInterface.sequelize.query(
      `UPDATE "${tableName}" SET "reactionType" = 'like' WHERE "reactionType" IS NULL`,
    );

    await queryInterface.changeColumn(tableName, 'reactionType', {
      type: Sequelize.STRING(20),
      allowNull: false,
      defaultValue: 'like',
    });

    const indexes = await queryInterface.showIndex(tableName);
    const indexNames = new Set(indexes.map((index) => index.name));

    if (!indexNames.has('unique_user_target_reaction')) {
      await queryInterface.addIndex(
        tableName,
        ['userId', 'targetType', 'targetId'],
        {
          unique: true,
          name: 'unique_user_target_reaction',
        },
      );
    }

    if (!indexNames.has('idx_target_type_target_id')) {
      await queryInterface.addIndex(tableName, ['targetType', 'targetId'], {
        name: 'idx_target_type_target_id',
      });
    }

    if (!indexNames.has('idx_reactions_user_id')) {
      await queryInterface.addIndex(tableName, ['userId'], {
        name: 'idx_reactions_user_id',
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('reactions');
  },
};
