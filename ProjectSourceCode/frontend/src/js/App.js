import React, { useEffect, useState } from 'react';
import BalloonMap from './components/BalloonMap';

function App() {
  const [balloons, setBalloons] = useState([]);
  const API_URL = process.env.REACT_APP_API_URL;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`${API_URL}/api/balloons`);
        const data = await res.json();

        const cleaned = data.map(b => ({
          id: b.id,
          lat: b.lat,
          lon: b.lon,
          alt: b.altitude ?? null,
          time: b.timestamp ?? null,
        }));

        setBalloons(cleaned);
      } catch (err) {
        console.error('Failed to fetch balloon data:', err);
      }
    };

    fetchData();
  }, [API_URL]);

  return <BalloonMap balloonData={balloons} />;
}

export default App;