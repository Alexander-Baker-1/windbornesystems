import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

function BalloonMap({ balloonData }) {
  return (
    <MapContainer center={[20, 0]} zoom={2} style={{ height: '100vh', width: '100%' }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {balloonData.map((b, i) => (
        <Marker key={`${b.id}-${i}`} position={[b.lat, b.lon]}>
          <Popup>
            <b>ID:</b> {b.id}<br />
            <b>Altitude:</b> {b.alt ?? 'Unknown'} m<br />
            <b>Time:</b> {b.time ?? 'N/A'}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

export default BalloonMap;