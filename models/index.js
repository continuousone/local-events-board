const db = require('../config/database');

const Event = require('./Event');
const Attendee = require('./Attendee');
const EventAttendee = require('./EventAttendee');

// Many-to-many: an Event has many Attendees, an Attendee can RSVP to many Events
Event.belongsToMany(Attendee, { through: EventAttendee, foreignKey: 'eventId' });
Attendee.belongsToMany(Event, { through: EventAttendee, foreignKey: 'attendeeId' });

// Sync all three tables (events, attendees, event_attendees) together,
// so the join table is created only after both sides of the relationship exist
db.sync({ alter: true }).then(() => {
  console.log('All tables synced');
});

module.exports = { db, Event, Attendee, EventAttendee };
