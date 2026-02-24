import { useEffect, useState } from 'react';
import api from '../api/client.js';

export default function Payroll() {
  const [payslips, setPayslips] = useState([]);

  useEffect(() => {
    api.get('/payroll/payslips').then(({ data }) => setPayslips(data.payslips || [])).catch(() => setPayslips([]));
  }, []);

  return (
    <div>
      <h2>Payslips</h2>
      <ul className="list">
        {payslips.map((p) => (
          <li key={p.id}>{p.period}</li>
        ))}
        {!payslips.length && <li>No payslips yet</li>}
      </ul>
    </div>
  );
}
