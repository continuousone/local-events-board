const express = require('express');
const router = express.Router();
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');
const Event = require('../models/Event');
const Attendee = require('../models/Attendee');
const EventAttendee = require('../models/EventAttendee');
const Sequelize = require('sequelize');
const Op = Sequelize.Op;

// Upload event images straight to Cloudinary instead of local disk,
// since Render's filesystem doesn't persist across deploys/restarts
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'local-events-board',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp']
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }
});

// Get event list, with optional sort-by-date and filter-by-category
router.get('/', (req, res) => {
  let { sort, category } = req.query;

  const where = {};
  if (category && category !== 'all') {
    where.category = category;
  }

  const order = sort === 'date_desc'
    ? [['event_date', 'DESC']]
    : [['event_date', 'ASC']];

  Promise.all([
    Event.findAll({ where, raw: true, order }),
    Event.findAll({
      attributes: [[Sequelize.fn('DISTINCT', Sequelize.col('category')), 'category']],
      raw: true,
      order: [['category', 'ASC']]
    }),
  EventAttendee.findAll({
  attributes: ['eventId', [Sequelize.fn('COUNT', Sequelize.col('eventId')), 'count']],
  group: ['eventId'],
  raw: true
})
  ])
    .then(([events, categoryRows, rsvpCounts]) => {
      const categories = categoryRows.map(row => row.category).filter(Boolean);

      // Attach an attendee count to each event, defaulting to 0
      const countsByEventId = {};
      rsvpCounts.forEach(row => {
        countsByEventId[row.eventId] = parseInt(row.count, 10);
      });
      events.forEach(event => {
        event.attendeeCount = countsByEventId[event.id] || 0;
      });

      res.render('events', {
        events,
        categories,
        sort: sort || 'date_asc',
        category: category || 'all'
      });
    })
    .catch(err => res.render('error', { error: err }));
});

// Display add event form
router.get('/add', (req, res) => res.render('add'));

// Add an event
router.post('/add', upload.single('image'), (req, res) => {
  let { title, category, event_date, location, description, contact_email } = req.body;
  let errors = [];

  if (!title) errors.push({ text: 'Please add a title' });
  if (!category) errors.push({ text: 'Please add a category' });
  if (!event_date) errors.push({ text: 'Please add a date' });
  if (!location) errors.push({ text: 'Please add a location' });
  if (!description) errors.push({ text: 'Please add a description' });
  if (!contact_email) errors.push({ text: 'Please add a contact email' });

  if (errors.length > 0) {
    res.render('add', {
      errors,
      title,
      category,
      event_date,
      location,
      description,
      contact_email
    });
  } else {
    category = category.toLowerCase();

    Event.create({
      title,
      category,
      event_date,
      location,
      description,
      contact_email,
      image: req.file ? req.file.path : null
    })
      .then(event => res.redirect('/events'))
      .catch(err => res.render('error', { error: err.message }));
  }
});

// Display edit event form
router.get('/edit/:id', (req, res) => {
  Event.findByPk(req.params.id, { raw: true })
    .then(event => {
      if (!event) return res.redirect('/events');
      res.render('edit', { event });
    })
    .catch(err => res.render('error', { error: err }));
});

// Update an event
router.post('/edit/:id', upload.single('image'), (req, res) => {
  let { title, category, event_date, location, description, contact_email } = req.body;
  let errors = [];

  if (!title) errors.push({ text: 'Please add a title' });
  if (!category) errors.push({ text: 'Please add a category' });
  if (!event_date) errors.push({ text: 'Please add a date' });
  if (!location) errors.push({ text: 'Please add a location' });
  if (!description) errors.push({ text: 'Please add a description' });
  if (!contact_email) errors.push({ text: 'Please add a contact email' });

  if (errors.length > 0) {
    return res.render('edit', {
      errors,
      event: { id: req.params.id, title, category, event_date, location, description, contact_email }
    });
  }

  category = category.toLowerCase();

  const updateData = { title, category, event_date, location, description, contact_email };
  if (req.file) {
    updateData.image = req.file.path;
  }

  Event.update(updateData, { where: { id: req.params.id } })
    .then(() => res.redirect('/events'))
    .catch(err => res.render('error', { error: err.message }));
});

// Delete an event
router.post('/delete/:id', (req, res) => {
  Event.destroy({ where: { id: req.params.id } })
    .then(() => res.redirect('/events'))
    .catch(err => res.render('error', { error: err.message }));
});

// Show RSVP form + who's already RSVP'd for an event
router.get('/:id/rsvp', (req, res) => {
  Event.findByPk(req.params.id)
    .then(event => {
      if (!event) return res.redirect('/events');
      return event.getAttendees()
        .then(attendeeInstances => {
          const attendees = attendeeInstances.map(a => ({
            name: a.name,
            email: a.email,
            status: a.event_attendee ? a.event_attendee.status : 'going'
          }));
          res.render('rsvp', { event: event.get({ plain: true }), attendees });
        });
    })
    .catch(err => res.render('error', { error: err.message }));
});

// Submit an RSVP
router.post('/:id/rsvp', (req, res) => {
  const { name, email, status } = req.body;
  let errors = [];

  if (!name) errors.push({ text: 'Please add your name' });
  if (!email) errors.push({ text: 'Please add your email' });

  if (errors.length > 0) {
    return Event.findByPk(req.params.id, { raw: true })
      .then(event => {
        if (!event) return res.redirect('/events');
        res.render('rsvp', { event, errors, name, email });
      })
      .catch(err => res.render('error', { error: err.message }));
  }

  Event.findByPk(req.params.id)
    .then(event => {
      if (!event) return res.redirect('/events');

      Attendee.findOrCreate({ where: { email }, defaults: { name } })
        .then(([attendee]) =>
          EventAttendee.findOrCreate({
            where: { eventId: event.id, attendeeId: attendee.id },
            defaults: { status: status || 'going' }
          }).then(([rsvp, created]) => {
            if (!created) {
              rsvp.status = status || 'going';
              return rsvp.save();
            }
          })
        )
        .then(() => res.redirect(`/events/${event.id}/rsvp`));
    })
    .catch(err => res.render('error', { error: err.message }));
});

// Search for events by category or location
router.get('/search', (req, res) => {
  let { term } = req.query;
  term = (term || '').toLowerCase();

  Event.findAll({
    where: {
      [Op.or]: [
        { category: { [Op.iLike]: '%' + term + '%' } },
        { location: { [Op.iLike]: '%' + term + '%' } }
      ]
    },
    raw: true,
    order: [['event_date', 'ASC']]
  })
    .then(events => res.render('events', { events }))
    .catch(err => res.render('error', { error: err }));
});

module.exports = router;