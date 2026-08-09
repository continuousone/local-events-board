const Sequelize = require('sequelize');
const db = require('../config/database');

// Join table between Event and Attendee, with RSVP-specific fields
const EventAttendee = db.define('event_attendee', {
  status: {
    type: Sequelize.STRING,
    defaultValue: 'going' // going, interested, cancelled
  },
  rsvp_date: {
    type: Sequelize.DATE,
    defaultValue: Sequelize.NOW
  }
});

module.exports = EventAttendee;
