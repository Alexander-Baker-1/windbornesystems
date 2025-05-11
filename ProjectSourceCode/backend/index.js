// ---------------------------------- DEPENDENCIES ----------------------------------------------
const express = require('express');
const session = require('express-session');
const path = require('path');
const bodyParser = require('body-parser');
const handlebars = require('express-handlebars');

// Local modules
const db = require('./db');
const { fetchAndStoreBalloons } = require('./jobs/fetchBalloons');

const app = express();

// ---------------------------------- VIEW CONFIG ----------------------------------------------
const hbs = handlebars.create({
  extname: 'hbs',
  layoutsDir: path.join(__dirname, 'src/views/layouts'),
  partialsDir: path.join(__dirname, 'src/views/partials'),
});

app.engine('hbs', hbs.engine);
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'src/views'));

// ---------------------------------- MIDDLEWARE ----------------------------------------------
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dev-secret',
    saveUninitialized: true,
    resave: true,
  })
);

app.use('/static', express.static(path.join(__dirname, 'src/resources')));

// ---------------------------------- ROUTES ----------------------------------------------
app.get('/', (req, res) => {
  res.render('pages/home');
});

app.use('/api/balloons', require('./routes/balloons')); // API endpoint

// ---------------------------------- REAL-TIME DATA INGEST ----------------------------------------------
fetchAndStoreBalloons(); // Initial pull on startup
setInterval(fetchAndStoreBalloons, 15 * 60 * 1000); // Refresh every 15 mins

// ---------------------------------- START SERVER ----------------------------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is listening on port ${PORT}`);
});