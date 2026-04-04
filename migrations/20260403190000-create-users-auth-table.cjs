'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableName = 'users';
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
        firstName: {
          type: Sequelize.STRING(100),
          allowNull: false,
        },
        lastName: {
          type: Sequelize.STRING(100),
          allowNull: false,
        },
        email: {
          type: Sequelize.STRING(150),
          allowNull: false,
          unique: true,
        },
        passwordHash: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        avatarUrl: {
          type: Sequelize.STRING,
          allowNull: true,
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

      return;
    }

    const table = await queryInterface.describeTable(tableName);

    if (!table.firstName) {
      await queryInterface.addColumn(tableName, 'firstName', {
        type: Sequelize.STRING(100),
        allowNull: true,
      });
    }

    if (!table.lastName) {
      await queryInterface.addColumn(tableName, 'lastName', {
        type: Sequelize.STRING(100),
        allowNull: true,
      });
    }

    if (!table.email) {
      await queryInterface.addColumn(tableName, 'email', {
        type: Sequelize.STRING(150),
        allowNull: true,
      });
    }

    if (!table.passwordHash) {
      await queryInterface.addColumn(tableName, 'passwordHash', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }

    if (!table.avatarUrl) {
      await queryInterface.addColumn(tableName, 'avatarUrl', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }

    if (!table.createdAt) {
      await queryInterface.addColumn(tableName, 'createdAt', {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      });
    }

    if (!table.updatedAt) {
      await queryInterface.addColumn(tableName, 'updatedAt', {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      });
    }

    await queryInterface.changeColumn(tableName, 'firstName', {
      type: Sequelize.STRING(100),
      allowNull: false,
    });
    await queryInterface.changeColumn(tableName, 'lastName', {
      type: Sequelize.STRING(100),
      allowNull: false,
    });
    await queryInterface.changeColumn(tableName, 'email', {
      type: Sequelize.STRING(150),
      allowNull: false,
    });
    await queryInterface.changeColumn(tableName, 'passwordHash', {
      type: Sequelize.STRING,
      allowNull: false,
    });

    const indexes = await queryInterface.showIndex(tableName);
    const hasEmailUniqueIndex = indexes.some(
      (index) =>
        index.unique &&
        Array.isArray(index.fields) &&
        index.fields.some((field) => field.attribute === 'email'),
    );

    if (!hasEmailUniqueIndex) {
      await queryInterface.addIndex(tableName, ['email'], {
        unique: true,
        name: 'users_email_unique',
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('users');
  },
};
