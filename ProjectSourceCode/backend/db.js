const pgp = require('pg-promise')();

// Allow DATABASE_URL or fallback to local dev config
const db = pgp(
  process.env.DATABASE_URL || {
    host: process.env.HOST || 'localhost',
    port: 5432,
    database: process.env.POSTGRES_DB,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD
  }
);

module.exports = db;