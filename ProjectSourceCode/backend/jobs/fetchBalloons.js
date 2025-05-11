const fetch = (...args) =>
  import('node-fetch').then(({ default: fetch }) => fetch(...args));
const db = require('../db');

async function fetchAndStoreBalloons() {
  console.log("🚀 Syncing Windborne balloon data...");

  // Delete old balloon records (older than 24 hours)
  try {
    await db.none(`
      DELETE FROM balloons
      WHERE timestamp < NOW() - INTERVAL '24 hours'
    `);
    console.log("🗑 Old balloon data cleaned up");
  } catch (err) {
    console.error("❌ Failed to clean old data:", err.message);
  }

  // Fetch and insert current balloon data
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

  console.log("✅ Balloon data sync complete");
}

module.exports = { fetchAndStoreBalloons };