import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { taka, day } from '../api';
import { Plus, Trash2, Pencil } from 'lucide-react';

export function Parties() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(null);
  const [err, setErr] = useState('');

  const load = () => api.get('/parties').then(setRows).catch(e => setErr(e.message));
  useEffect(() => { load(); }, []);

  const blank = () => ({ name: '', phone: '', address: '', note: '' });

  const save = async (e) => {
    e.preventDefault(); setErr('');
    try {
      if (form._id) await api.put(`/parties/${form._id}`, form);
      else await api.post('/parties', form);
      setForm(null); load();
    } catch (e2) { setErr(e2.message); }
  };

  const remove = async (id) => { if (!confirm('মুছবেন?')) return; await api.del(`/parties/${id}`); load(); };

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <h1 className="text-xl font-semibold text-forest">পার্টি তালিকা</h1>
        <button className="btn-primary ml-auto" onClick={() => { setErr(''); setForm(blank()); }}><Plus size={16} />নতুন পার্টি</button>
      </div>
      {err && !form && <p className="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">{err}</p>}

      {form && (
        <form onSubmit={save} className="card mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[['name', 'নাম', false], ['phone', 'ফোন', true], ['address', 'ঠিকানা', true], ['note', 'মন্তব্য', true]].map(([k, label, opt]) => (
            <label key={k} className="text-sm"><span className="mb-1 block text-slate-600">{label}</span>
              <input className="input" required={!opt} value={form[k]} onChange={e => setForm({ ...form, [k]: e.target.value })} /></label>
          ))}
          {err && <p className="col-span-full text-sm text-red-700">{err}</p>}
          <div className="col-span-full flex gap-2">
            <button className="btn-primary" type="submit">সংরক্ষণ</button>
            <button className="btn-ghost" type="button" onClick={() => setForm(null)}>বাতিল</button>
          </div>
        </form>
      )}

      <div className="card overflow-x-auto p-0">
        <table className="w-full">
          <thead><tr><th className="th">নাম</th><th className="th">ফোন</th><th className="th">বকেয়া টাকা</th><th className="th">বকেয়া ক্রেট</th><th className="th" /></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td className="td" colSpan={5}>কোনো পার্টি নেই</td></tr>}
            {rows.map(r => (
              <tr key={r._id} className="hover:bg-field">
                <td className="td"><Link className="font-medium text-forest underline" to={`/app/parties/${r._id}`}>{r.name}</Link></td>
                <td className="td">{r.phone}</td>
                <td className="td"><span className={r.outstandingMoney > 0 ? 'text-red-600 font-semibold' : 'text-green-600'}>{taka(r.outstandingMoney)}</span></td>
                <td className="td"><span className={r.outstandingCrates > 0 ? 'text-orange-600 font-semibold' : ''}>{r.outstandingCrates}</span></td>
                <td className="td text-right">
                  <button className="btn-ghost px-2" onClick={() => { setErr(''); setForm({ _id: r._id, name: r.name, phone: r.phone || '', address: r.address || '', note: r.note || '' }); }}><Pencil size={14} /></button>
                  <button className="btn-ghost px-2 text-red-600" onClick={() => remove(r._id)}><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function PartyLedger() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('ledger');
  const [err, setErr] = useState('');

  useEffect(() => { api.get(`/parties/${id}/ledger`).then(setData).catch(e => setErr(e.message)); }, [id]);

  if (err) return <p className="text-red-600">{err}</p>;
  if (!data) return <p className="p-6">লোড হচ্ছে…</p>;

  const { party, outstandingMoney, outstandingCrates, rows } = data;
  const supplies = rows.filter(r => r.type === 'SUPPLY');
  const payments = rows.filter(r => r.type === 'PAYMENT');
  const crates = rows.filter(r =>
    (r.type === 'SUPPLY' && Number(r.cratesSent) > 0) || r.type === 'CRATE_SENT' || r.type === 'CRATE_RETURN'
  );

  const tabs = [['ledger', 'সম্পূর্ণ লেজার'], ['supplies', 'সরবরাহ'], ['payments', 'পেমেন্ট'], ['crates', 'ক্রেট']];

  return (
    <div>
      <div className="mb-4">
        <Link to="/app/parties" className="text-sm text-forest underline">← পার্টি তালিকা</Link>
        <h1 className="mt-1 text-xl font-semibold text-forest">{party.name}</h1>
        {party.phone && <p className="text-sm text-slate-500">{party.phone}</p>}
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="card text-center"><p className="text-xs text-slate-500">বকেয়া টাকা</p><p className={`text-lg font-bold ${outstandingMoney > 0 ? 'text-red-600' : 'text-green-600'}`}>{taka(outstandingMoney)}</p></div>
        <div className="card text-center"><p className="text-xs text-slate-500">বকেয়া ক্রেট</p><p className={`text-lg font-bold ${outstandingCrates > 0 ? 'text-orange-600' : 'text-green-600'}`}>{outstandingCrates}</p></div>
        <div className="card text-center"><p className="text-xs text-slate-500">মোট সরবরাহ</p><p className="text-lg font-bold text-forest">{supplies.length} টি</p></div>
        <div className="card text-center"><p className="text-xs text-slate-500">মোট পেমেন্ট</p><p className="text-lg font-bold text-forest">{payments.length} টি</p></div>
      </div>

      <div className="mb-3 flex gap-2 border-b border-forest/20">
        {tabs.map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${tab === k ? 'border-forest text-forest' : 'border-transparent text-slate-500 hover:text-forest'}`}>{label}</button>
        ))}
      </div>

      <div className="card overflow-x-auto p-0">
        {tab === 'ledger' && (
          <table className="w-full">
            <thead><tr><th className="th">তারিখ</th><th className="th">ধরন</th><th className="th">বিবরণ</th><th className="th">কেজি</th><th className="th">ক্রেট</th><th className="th">প্রাপ্য</th><th className="th">প্রাপ্ত</th><th className="th">বকেয়া টাকা</th><th className="th">বকেয়া ক্রেট</th></tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="hover:bg-field">
                  <td className="td">{day(r.date)}</td>
                  <td className="td"><span className={`rounded px-2 py-0.5 text-xs font-medium ${r.type === 'SUPPLY' ? 'bg-blue-100 text-blue-700' : r.type === 'PAYMENT' ? 'bg-green-100 text-green-700' : r.type === 'CRATE_RETURN' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100'}`}>{r.type === 'SUPPLY' ? 'সরবরাহ' : r.type === 'PAYMENT' ? 'পেমেন্ট' : r.type === 'SETTLEMENT' ? 'নিষ্পত্তি' : r.type === 'CRATE_SENT' ? 'ক্রেট পাঠানো' : 'ক্রেট ফেরত'}</span></td>
                  <td className="td text-xs">{r.products || ''}</td>
                  <td className="td">{r.weightKg || ''}</td>
                  <td className="td">{r.cratesSent || r.cratesReturned || ''}</td>
                  <td className="td">{r.amountPayable ? taka(r.amountPayable) : ''}</td>
                  <td className="td">{r.amountReceived ? <span className="text-green-600">{taka(r.amountReceived)}</span> : ''}</td>
                  <td className="td font-semibold">{taka(r.outstandingMoney)}</td>
                  <td className="td">{r.outstandingCrates}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {tab === 'supplies' && (
          <table className="w-full">
            <thead><tr><th className="th">তারিখ</th><th className="th">পণ্য</th><th className="th">মোট কেজি</th><th className="th">ক্রেট</th><th className="th">প্রত্যাশিত</th></tr></thead>
            <tbody>
              {supplies.map((r, i) => <tr key={i} className="hover:bg-field"><td className="td">{day(r.date)}</td><td className="td text-xs">{r.products}</td><td className="td">{r.weightKg} kg</td><td className="td">{r.cratesSent}</td><td className="td">{taka(r.amountPayable)}</td></tr>)}
            </tbody>
          </table>
        )}
        {tab === 'payments' && (
          <table className="w-full">
            <thead><tr><th className="th">তারিখ</th><th className="th">পরিমাণ</th></tr></thead>
            <tbody>
              {payments.map((r, i) => <tr key={i} className="hover:bg-field"><td className="td">{day(r.date)}</td><td className="td font-semibold text-green-600">{taka(r.amountReceived)}</td></tr>)}
            </tbody>
          </table>
        )}
        {tab === 'crates' && (
          <table className="w-full">
            <thead><tr><th className="th">তারিখ</th><th className="th">ধরন</th><th className="th">সংখ্যা</th><th className="th">বকেয়া</th></tr></thead>
            <tbody>
              {crates.map((r, i) => <tr key={i} className="hover:bg-field"><td className="td">{day(r.date)}</td><td className="td">{r.type === 'SUPPLY' ? `মালের সাথে পাঠানো — ${r.products}` : r.type === 'CRATE_SENT' ? 'আলাদা করে পাঠানো' : 'ফেরত'}</td><td className="td">{r.cratesSent || r.cratesReturned}</td><td className="td font-semibold">{r.outstandingCrates}</td></tr>)}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
