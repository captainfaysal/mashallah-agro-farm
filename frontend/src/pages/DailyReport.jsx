import { useEffect, useState } from 'react';
import api, { taka, day } from '../api';

export default function DailyReport() {
  const [date, setDate] = useState(day(new Date()));
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get(`/reports/daily?date=${date}`).then(setData).catch(e => setErr(e.message));
  }, [date]);

  const s = data?.summary;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold text-forest">দৈনিক রিপোর্ট</h1>
        <input className="input ml-auto w-40" type="date" value={date} onChange={e => setDate(e.target.value)} />
        <button className="btn-ghost no-print" onClick={() => window.print()}>প্রিন্ট</button>
      </div>
      {err && <p className="text-red-600 text-sm">{err}</p>}

      {s && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[['ক্রয় (কেজি)', s.totalPurchaseKg?.toFixed(1) + ' kg'], ['ক্রয় খরচ', taka(s.totalPurchaseCost)], ['সরবরাহ (কেজি)', s.totalSuppliedKg?.toFixed(1) + ' kg'], ['সরবরাহ ক্রেট', s.totalSuppliedCrates], ['প্রাপ্ত টাকা', taka(s.totalMoneyReceived)], ['ক্রেট ফেরত', s.totalCrateReturns]].map(([l, v]) => (
            <div key={l} className="card text-center"><p className="text-xs text-slate-500">{l}</p><p className="mt-1 font-bold text-forest">{v}</p></div>
          ))}
        </div>
      )}

      {data?.purchases?.length > 0 && (
        <section>
          <h2 className="mb-2 font-semibold text-forest">ক্রয়</h2>
          <div className="card overflow-x-auto p-0">
            <table className="w-full">
              <thead><tr><th className="th">সরবরাহকারী</th><th className="th">পণ্য</th><th className="th">ল্যান্ডেড কস্ট</th></tr></thead>
              <tbody>{data.purchases.map(r => <tr key={r._id} className="hover:bg-field"><td className="td">{r.supplierName}</td><td className="td text-xs">{r.items?.map(i => `${i.productId?.name} ${i.weightKg}kg`).join(', ')}</td><td className="td font-semibold">{taka(r.landedCost)}</td></tr>)}</tbody>
            </table>
          </div>
        </section>
      )}

      {data?.supplies?.length > 0 && (
        <section>
          <h2 className="mb-2 font-semibold text-forest">সরবরাহ</h2>
          <div className="card overflow-x-auto p-0">
            <table className="w-full">
              <thead><tr><th className="th">পার্টি</th><th className="th">পণ্য</th><th className="th">কেজি</th><th className="th">ক্রেট</th><th className="th">প্রত্যাশিত</th></tr></thead>
              <tbody>{data.supplies.map(r => <tr key={r._id} className="hover:bg-field"><td className="td">{r.partyId?.name}</td><td className="td text-xs">{r.items?.map(i => `${i.productId?.name}`).join(', ')}</td><td className="td">{r.totalWeightKg} kg</td><td className="td">{r.totalCrates}</td><td className="td">{taka(r.totalExpectedAmount)}</td></tr>)}</tbody>
            </table>
          </div>
        </section>
      )}

      {data?.payments?.length > 0 && (
        <section>
          <h2 className="mb-2 font-semibold text-forest">পেমেন্ট</h2>
          <div className="card overflow-x-auto p-0">
            <table className="w-full">
              <thead><tr><th className="th">পার্টি</th><th className="th">পরিমাণ</th><th className="th">মন্তব্য</th></tr></thead>
              <tbody>{data.payments.map(r => <tr key={r._id} className="hover:bg-field"><td className="td">{r.partyId?.name}</td><td className="td font-semibold text-green-600">{taka(r.amount)}</td><td className="td">{r.note}</td></tr>)}</tbody>
            </table>
          </div>
        </section>
      )}

      {data?.crateReturns?.length > 0 && (
        <section>
          <h2 className="mb-2 font-semibold text-forest">ক্রেট ফেরত</h2>
          <div className="card overflow-x-auto p-0">
            <table className="w-full">
              <thead><tr><th className="th">পার্টি</th><th className="th">সংখ্যা</th></tr></thead>
              <tbody>{data.crateReturns.map(r => <tr key={r._id} className="hover:bg-field"><td className="td">{r.partyId?.name}</td><td className="td font-semibold">{r.quantity}</td></tr>)}</tbody>
            </table>
          </div>
        </section>
      )}

      {data && !data.purchases?.length && !data.supplies?.length && !data.payments?.length && (
        <p className="text-slate-500">এই তারিখে কোনো লেনদেন নেই।</p>
      )}
    </div>
  );
}
