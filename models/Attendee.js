const Sequelize = require('sequelize');
const db = require('../config/database');

const Attendee = db.define('attendee', {
  name: {
    type: Sequelize.STRING
  },
  email: {
    type: Sequelize.STRING
  }
});

module.exports = Attendee;
