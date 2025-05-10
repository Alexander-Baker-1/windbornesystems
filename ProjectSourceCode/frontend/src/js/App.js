import React, { useEffect, useState } from 'react';
import BalloonMap from './components/BalloonMap';

function App() {
  const [balloons, setBalloons] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      let all = [];

      for (let i = 0; i < 24; i++) {
        try {
          const res = await fetch(`https://a.windbornesystems.com/treasure/${String(i).padStart(2, '0')}.json`);
          const data = await res.json();

          data.forEach(b => {
            if (b && b.lat && b.lon && b.id) {
              all.push({
                id: b.id,
                lat: b.lat,
                lon: b.lon,
                alt: b.altitude ?? null,
                time: b.timestamp ?? null,
              });
            }
          });
        } catch (e) {
          console.warn(`Failed on ${i}:`, e);
        }
      }

      setBalloons(all);
    };

    fetchData();
  }, []);

  return <BalloonMap balloonData={balloons} />;
}

export default App;