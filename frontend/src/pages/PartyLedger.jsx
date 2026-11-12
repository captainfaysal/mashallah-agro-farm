import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api, { day, taka } from '../api';

const LABEL = { SALE: 'Sale', PURCHASE: 'Purchase', PAYMENT_IN: 'Payment received', PAYMENT_OUT: 'Payment made' };

export default function PartyLedger() {
  const { id } = useParams();
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => { api.get(`/parties/${id}/ledger`).then(setData).catch((e) => setErr(e.message)); }, [id]);

  if (err) return <p role="alert" className="text-red-700">{err}</p>;
  if (!data) return <p>{t('Loading…')}</p>;
  const { party, balance, rows } = data;

  return (
    <div className="space-y-4">
      <Link to="/app/parties" className="text-sm text-forest underline">{t('Back to parties')}</Link>
      <div className="flex flex-wrap items-baseline gap-3">
        <h1 className="text-xl font-semibold text-forest">{party.name}</h1>
        <span className="text-sm text-slate-600">{party.phone}</span>
        <span className={`ml-auto text-lg font-semibold ${balance > 0 ? 'text-leaf' : 'text-saffron'}`}>
          {balance === 0 ? '—' : `${taka(Math.abs(balance))} ${t(balance > 0 ? 'To receive' : 'To pay')}`}
        </span>
      </div>
      <div className="card overflow-x-auto p-0">
        <table className="w-full">
          <thead><tr>{['Date', 'Type', 'Details', 'Total', 'Paid', 'Balance'].map((h) => <th key={h} className="th">{t(h === 'Paid' ? 'Paid now' : h)}</th>)}</tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}><td className="td">{day(r.date)}</td><td className="td">{t(LABEL[r.kind])}</td><td className="td">{r.text}</td>
                <td className="td">{r.total ? taka(r.total) : ''}</td><td className="td">{taka(r.paid)}</td><td className="td font-medium">{taka(r.balance)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
