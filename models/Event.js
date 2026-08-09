const Sequelize = require('sequelize');
const db = require('../config/database');

const Event = db.define('event', {
  title: {
    type: Sequelize.STRING
  },
  category: {
    type: Sequelize.STRING
  },
  event_date: {
    type: Sequelize.DATEONLY
  },
  location: {
    type: Sequelize.STRING
  },
  description: {
    type: Sequelize.STRING
  },
  contact_email: {
    type: Sequelize.STRING
  },
  image: {
    type: Sequelize.STRING
  }
});

module.exports = Event;