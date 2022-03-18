const Sequelize = require('sequelize');

const sequelize = require('../util/database');

const Fees = sequelize.define('feeconfig', {
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
  feeid: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  fee_currency: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  fee_locale: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  fee_entity_property: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  fee_type: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  fee_value: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  createdAt: {
    allowNull: false,
    type: Sequelize.DATE,
    defaultValue: Sequelize.NOW,
  },
  updatedAt: {
    allowNull: false,
    type: Sequelize.DATE,
    defaultValue: Sequelize.NOW,
  },
});

module.exports = Fees;
