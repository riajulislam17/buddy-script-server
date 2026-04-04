'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableName = 'posts';
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
        content: {
          type: Sequelize.TEXT,
          allowNull: false,
        },
        imageUrls: {
          type: Sequelize.ARRAY(Sequelize.STRING),
          allowNull: true,
        },
        visibility: {
          type: Sequelize.STRING(20),
          allowNull: false,
          defaultValue: 'public',
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

    if (!table.imageUrls) {
      await queryInterface.addColumn(tableName, 'imageUrls', {
        type: Sequelize.ARRAY(Sequelize.STRING),
        allowNull: true,
      });
    }

    const indexes = await queryInterface.showIndex(tableName);
    const indexNames = new Set(indexes.map((index) => index.name));

    if (!indexNames.has('idx_posts_visibility')) {
      await queryInterface.addIndex(tableName, ['visibility'], {
        name: 'idx_posts_visibility',
      });
    }

    if (!indexNames.has('idx_posts_user_id')) {
      await queryInterface.addIndex(tableName, ['userId'], {
        name: 'idx_posts_user_id',
      });
    }

    if (!indexNames.has('idx_posts_created_at_id')) {
      await queryInterface.addIndex(tableName, ['createdAt', 'id'], {
        name: 'idx_posts_created_at_id',
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('posts');
  },
};
