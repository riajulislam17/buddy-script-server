'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableName = 'comments';
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
        postId: {
          type: Sequelize.BIGINT,
          allowNull: false,
          references: {
            model: 'posts',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
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
        parentId: {
          type: Sequelize.BIGINT,
          allowNull: true,
          references: {
            model: 'comments',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        content: {
          type: Sequelize.TEXT,
          allowNull: false,
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

    if (!table.parentId) {
      await queryInterface.addColumn(tableName, 'parentId', {
        type: Sequelize.BIGINT,
        allowNull: true,
        references: {
          model: 'comments',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      });
    }

    const indexes = await queryInterface.showIndex(tableName);
    const indexNames = new Set(indexes.map((index) => index.name));

    if (!indexNames.has('idx_comments_post_id')) {
      await queryInterface.addIndex(tableName, ['postId'], {
        name: 'idx_comments_post_id',
      });
    }

    if (!indexNames.has('idx_comments_user_id')) {
      await queryInterface.addIndex(tableName, ['userId'], {
        name: 'idx_comments_user_id',
      });
    }

    if (!indexNames.has('idx_comments_parent_id')) {
      await queryInterface.addIndex(tableName, ['parentId'], {
        name: 'idx_comments_parent_id',
      });
    }

    if (!indexNames.has('idx_comments_post_parent_created_at_id')) {
      await queryInterface.addIndex(
        tableName,
        ['postId', 'parentId', 'createdAt', 'id'],
        {
          name: 'idx_comments_post_parent_created_at_id',
        },
      );
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('comments');
  },
};
