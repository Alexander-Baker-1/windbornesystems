const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const db = require('./db');
const { fetchAndStoreBalloons } = require('./jobs/fetchBalloons');

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dev-secret',
    saveUninitialized: true,
    resave: true,
  })
);

// API routes
app.use('/api/balloons', require('./routes/balloons'));

// Run SQL init files
async function runInitSQL() {
  try {
    const createSQL = fs.readFileSync(path.join(__dirname, 'src/init_data/create.sql'), 'utf-8');
    await db.none(createSQL);
    console.log('✅ Ran create.sql successfully');
  } catch (err) {
    console.error('❌ Failed to run create.sql:', err.message);
  }

  try {
    const insertSQL = fs.readFileSync(path.join(__dirname, 'src/init_data/insert.sql'), 'utf-8');
    if (insertSQL.trim()) {
      await db.none(insertSQL);
      console.log('✅ Ran insert.sql successfully');
    } else {
      console.log('ℹ️ insert.sql is empty — skipping insert.');
    }
  } catch (err) {
    console.error('❌ Failed to run insert.sql:', err.message);
  }
}

// Init + background balloon sync
runInitSQL().then(() => {
  fetchAndStoreBalloons();
  setInterval(fetchAndStoreBalloons, 15 * 60 * 1000);
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend API running on port ${PORT}`);
});