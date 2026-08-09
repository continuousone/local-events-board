const express = require('express');
const { engine } = require('express-handlebars');
const path = require('path');

// Database
const db = require('./config/database');

// Load models + associations, and sync all tables together
require('./models');

// Test DB
db.authenticate()
  .then(() => console.log('Database connected...'))
  .catch(err => console.log('Error: ' + err));

const app = express();

// Handlebars
app.engine('handlebars', engine({
  defaultLayout: 'main',
  helpers: {
    ifEquals: function (a, b, options) {
      return a === b ? options.fn(this) : options.inverse(this);
    }
  }
}));
app.set('view engine', 'handlebars');

// Body Parser
app.use(express.urlencoded({ extended: false }));

// Set static folder
app.use(express.static(path.join(__dirname, 'public')));

// Index route
app.get('/', (req, res) => res.render('index', { layout: 'landing' }));

// Event routes
app.use('/events', require('./routes/events'));

const PORT = process.env.PORT || 5002;

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
