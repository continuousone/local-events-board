const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const Event = require('../models/Event');
const Sequelize = require('sequelize');
const Op = Sequelize.Op;

// Where uploaded event images get saved, and how they're named
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../public/uploads')),
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// Only accept image files, cap size at 5MB
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Get event list
router.get('/', (req, res) =>
  Event.findAll({ raw: true, order: [['event_date', 'ASC']] })
    .then(events => res.render('events', { events }))
    .catch(err => res.render('error', { error: err })));

// Display add event form
router.get('/add', (req, res) => res.render('add'));

// Add an event
router.post('/add', upload.single('image'), (req, res) => {
  let { title, category, event_date, location, description, contact_email } = req.body;
  let errors = [];

  // Validate fields
  if (!title) {
    errors.push({ text: 'Please add a title' });
  }
  if (!category) {
    errors.push({ text: 'Please add a category' });
  }
  if (!event_date) {
    errors.push({ text: 'Please add a date' });
  }
  if (!location) {
    errors.push({ text: 'Please add a location' });
  }
  if (!description) {
    errors.push({ text: 'Please add a description' });
  }
  if (!contact_email) {
    errors.push({ text: 'Please add a contact email' });
  }

  // Check for errors
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
    // Make category lowercase for consistent searching
    category = category.toLowerCase();

    // Insert into table
    Event.create({
      title,
      category,
      event_date,
      location,
      description,
      contact_email,
      image: req.file ? req.file.filename : null
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
    updateData.image = req.file.filename; // only overwrite image if a new one was uploaded
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
