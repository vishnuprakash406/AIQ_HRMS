import { useEffect, useState } from 'react';
import api from '../api/client.js';

export default function Inventory() {
  const [items, setItems] = useState([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    api.get('/inventory').then(({ data }) => setItems(data.items || [])).catch(() => setItems([]));
  }, []);

  return (
    <div>
      <h2>Inventory</h2>
      {message && <p className="status">{message}</p>}
      <ul className="list">
        {items.map((item) => (
          <li key={item.id}>{item.name}</li>
        ))}
        {!items.length && <li>No items</li>}
      </ul>
    </div>
  );
}
