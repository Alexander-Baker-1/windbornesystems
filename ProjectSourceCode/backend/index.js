const db = require('../db');

async function fetchAndStoreBalloons() {
  const useFallback = process.env.NODE_ENV === 'development' || process.env.USE_FAKE_BALLOONS === 'true';

  if (useFallback) {
    console.log('⚠️ Fallback mode active — inserting demo balloon...');
    try {
      await db.none(
        `INSERT INTO balloons (id, lat, lon, altitude, timestamp, hour_index)
         VALUES ('demo123', 39.7392, -104.9903, 10000, NOW(), 0)
         ON CONFLICT (id, hour_index) DO NOTHING`
      );
      console.log('✅ Fallback balloon inserted.');
    } catch (err) {
      console.error('❌ Failed to insert fallback balloon:', err.message);
    }
    return;
  }

  console.log('🚀 Syncing Windborne balloon data...');
  for (let i = 0; i < 24; i++) {
    try {
      const res = await fetch(`https://a.windbornesystems.com/treasure/${String(i).padStart(2, '0')}.json`);
      const data = await res.json();

      for (const b of data) {
        if (b?.id && b?.lat && b?.lon) {
          await db.none(
            `INSERT INTO balloons (id, lat, lon, altitude, timestamp, hour_index)
             VALUES ($1, $2, $3, $4, to_timestamp($5 / 1000.0), $6)
             ON CONFLICT (id, hour_index) DO NOTHING`,
            [b.id, b.lat, b.lon, b.altitude, b.timestamp, i]
          );
        }
      }
    } catch (err) {
      console.error(`❌ Failed fetching hour ${i}:`, err.message);
    }
  }

  console.log('✅ Balloon data sync complete');
}

module.exports = { fetchAndStoreBalloons };