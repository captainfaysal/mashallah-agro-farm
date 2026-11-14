import { useEffect, useState } from 'react';
import api, { taka } from '../api';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [parties, setParties] = useState([]);
  const [period, setPeriod] = useState('daily');

  useEffect(() => {
    api.get('/reports/summary').then(setData).catch(() => {});
    api.get('/parties').then(setParties).catch(() => {});
  }, []);

  const t = data?.today;
  const periodOptions = [
    { key: 'daily', label: 'দৈনিক হিসাব', range: 'আজকের হিসাব' },
    { key: 'monthly', label: 'মাসিক হিসাব', range: 'এই মাসের শুরু থেকে আজ পর্যন্ত' },
    { key: 'yearly', label: 'বার্ষিক হিসাব', range: 'এই বছরের শুরু থেকে আজ পর্যন্ত' },
  ];
  const activePeriod = periodOptions.find((option) => option.key === period);
  const totals = data?.profitLoss?.[period];
  const profit = Number(totals?.profit || 0);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-forest">ড্যাশবোর্ড</h1>
        <p className="mt-1 text-sm text-slate-500">খামারের আয়, খরচ ও বকেয়ার এক নজরের হিসাব</p>
      </header>

      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-forest">আয়-ব্যয়ের হিসাব</h2>
            <p className="text-sm text-slate-500">{activePeriod?.range} · গরুর হিসাব বাদ</p>
          </div>
          <div className="flex rounded-lg bg-slate-100 p-1" role="tablist" aria-label="হিসাবের সময়সীমা">
            {periodOptions.map((option) => (
              <button
                key={option.key}
                type="button"
                role="tab"
                aria-selected={period === option.key}
                onClick={() => setPeriod(option.key)}
                className={`rounded-md px-3 py-2 text-sm font-medium transition ${period === option.key ? 'bg-white text-forest shadow-sm' : 'text-slate-600 hover:text-forest'}`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="card border-l-4 border-l-green-500">
            <p className="text-sm text-slate-500">মোট আয় (প্রাপ্ত পেমেন্টসহ)</p>
            <p className="mt-2 text-2xl font-bold text-green-700">{totals ? taka(totals.income) : '—'}</p>
          </div>
          <div className="card border-l-4 border-l-red-500">
            <p className="text-sm text-slate-500">মোট খরচ</p>
            <p className="mt-2 text-2xl font-bold text-red-600">{totals ? taka(totals.expense) : '—'}</p>
          </div>
          <div className={`card border-l-4 ${profit >= 0 ? 'border-l-forest' : 'border-l-orange-500'}`}>
            <p className="text-sm text-slate-500">{profit >= 0 ? 'নিট লাভ' : 'নিট ক্ষতি'}</p>
            <p className={`mt-2 text-2xl font-bold ${profit >= 0 ? 'text-forest' : 'text-orange-600'}`}>
              {totals ? taka(Math.abs(profit)) : '—'}
            </p>
          </div>
        </div>
      </section>

      <div>
        <h2 className="mb-2 text-lg font-semibold text-forest">আজকের কাজের সারসংক্ষেপ</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            ['ক্রয় (কেজি)', t?.purchaseKg?.toFixed(1) + ' kg'],
            ['ক্রয় খরচ', taka(t?.purchaseCost)],
            ['সরবরাহ (কেজি)', t?.suppliedKg?.toFixed(1) + ' kg'],
            ['সরবরাহ ক্রেট', t?.suppliedCrates],
            ['প্রাপ্ত টাকা', taka(t?.moneyReceived)],
            ['ক্রেট ফেরত', t?.crateReturns],
          ].map(([label, val]) => (
            <div key={label} className="card text-center">
              <p className="text-xs text-slate-500">{label}</p>
              <p className="mt-1 text-lg font-bold text-forest">{val ?? '—'}</p>
            </div>
          ))}
        </div>
      </div>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-forest">মোট লাভ/ক্ষতি (পার্টিওয়ারি)</h2>
        <div className="grid gap-3 sm:grid-cols-2">
        <div className="card text-center">
          <p className="text-sm text-slate-500">মোট লাভ/ক্ষতি</p>
          <p className={`text-2xl font-bold ${data?.totalProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {data?.totalProfitLoss >= 0 ? '▲ ' : '▼ '}{taka(Math.abs(data?.totalProfitLoss || 0))}
          </p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-slate-500">মোট বকেয়া ক্রেট</p>
          <p className="text-2xl font-bold text-orange-600">{data?.totalOutstandingCrates ?? '—'}</p>
        </div>
        </div>
      </section>

      <div>
        <h2 className="mb-2 text-lg font-semibold text-forest">পার্টিওয়ারি লাভ/ক্ষতি</h2>
        <div className="card overflow-x-auto p-0">
          <table className="w-full">
            <thead><tr><th className="th">পার্টি</th><th className="th">লাভ/ক্ষতি</th><th className="th">বকেয়া ক্রেট</th></tr></thead>
            <tbody>
              {parties.filter(p => p.profitLoss !== 0 || p.outstandingCrates > 0).map(p => (
                <tr key={p._id} className="hover:bg-field">
                  <td className="td font-medium">{p.name}</td>
                  <td className="td">
                    <span className={p.profitLoss > 0 ? 'text-green-600 font-semibold' : p.profitLoss < 0 ? 'text-red-600 font-semibold' : ''}>
                      {p.profitLoss > 0 ? '▲ ' : p.profitLoss < 0 ? '▼ ' : ''}{taka(Math.abs(p.profitLoss || 0))}
                    </span>
                  </td>
                  <td className="td"><span className="text-orange-600 font-semibold">{p.outstandingCrates}</span></td>
                </tr>
              ))}
              {parties.filter(p => p.profitLoss !== 0 || p.outstandingCrates > 0).length === 0 && (
                <tr><td className="td" colSpan={3}>কোনো লেনদেন নেই ✓</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
