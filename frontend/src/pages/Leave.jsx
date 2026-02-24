import { useState } from 'react';
import api from '../api/client.js';

export default function Leave() {
  const [type, setType] = useState('annual');
  const [startDate, setStart] = useState('');
  const [endDate, setEnd] = useState('');
  const [balance, setBalance] = useState(null);
  const [message, setMessage] = useState('');

  const apply = async () => {
    const { data } = await api.post('/leave/apply', { type, startDate, endDate });
    setMessage(data.message);
  };

  const fetchBalance = async () => {
    const { data } = await api.get('/leave/balance');
    setBalance(data.balance);
  };

  return (
    <div>
      <h2>Leave</h2>
      <div className="grid">
        <input placeholder="Type" value={type} onChange={(e) => setType(e.target.value)} />
        <input type="date" value={startDate} onChange={(e) => setStart(e.target.value)} />
        <input type="date" value={endDate} onChange={(e) => setEnd(e.target.value)} />
      </div>
      <div className="row">
        <button onClick={apply}>Apply</button>
        <button onClick={fetchBalance}>Get Balance</button>
      </div>
      {message && <p className="status">{message}</p>}
      {balance && <pre className="card">{JSON.stringify(balance, null, 2)}</pre>}
    </div>
  );
}
