const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', async (req, res) => {
  try {
    const data = await db.any(
      'SELECT * FROM balloons ORDER BY timestamp DESC LIMIT 500'
    );
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load balloon data' });
  }
});

module.exports = router;