import { useEffect, useState } from 'react';
import api, { taka, day } from '../api';
import { Plus, Trash2, Pencil } from 'lucide-react';

const blank = () => ({ date: day(new Date()), kind: 'EXPENSE', category: '', amount: '', note: '' });

export default function Daybook() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(null);
  const [err, setErr] = useState('');

  const load = () => api.get('/entries').then(setRows).catch(e => setErr(e.message));
  useEffect(() => { load(); }, []);

  const save = async (e) => {
    e.preventDefault(); setErr('');
    try {
      const body = { ...form, amount: Number(form.amount) };
      if (form._id) await api.put(`/entries/${form._id}`, body);
      else await api.post('/entries', body);
      setForm(null); load();
    } catch (e2) { setErr(e2.message); }
  };

  const remove = async (id) => { if (!confirm('মুছবেন?')) return; await api.del(`/entries/${id}`); load(); };

  const totalIncome = rows.filter(r => r.kind === 'INCOME').reduce((s, r) => s + Number(r.amount || 0), 0);
  const totalExpense = rows.filter(r => r.kind === 'EXPENSE').reduce((s, r) => s + Number(r.amount || 0), 0);

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <h1 className="text-xl font-semibold text-forest">দৈনিক আয়-ব্যয় খাতা</h1>
        <button className="btn-primary ml-auto" onClick={() => { setErr(''); setForm(blank()); }}><Plus size={16} />অন্যান্য আয়-ব্যয় যোগ করুন</button>
      </div>
      <p className="mb-3 text-sm text-slate-500">ক্রয় খরচ ও পাওয়া পেমেন্টের টাকা স্বয়ংক্রিয়ভাবে যুক্ত হয়। এখানে ম্যানুয়ালি অন্যান্য আয়-ব্যয় যোগ করতে পারবেন।</p>
      {err && !form && <p className="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">{err}</p>}

      {form && (
        <form onSubmit={save} className="card mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-sm"><span className="mb-1 block text-slate-600">তারিখ</span>
            <input className="input" type="date" required value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></label>
          <label className="text-sm"><span className="mb-1 block text-slate-600">ধরন</span>
            <select className="input" value={form.kind} onChange={e => setForm({ ...form, kind: e.target.value })}>
              <option value="EXPENSE">ব্যয়</option>
              <option value="INCOME">আয়</option>
            </select></label>
          <label className="text-sm"><span className="mb-1 block text-slate-600">খাত</span>
            <input className="input" required value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} /></label>
          <label className="text-sm"><span className="mb-1 block text-slate-600">পরিমাণ</span>
            <input className="input" type="number" step="0.01" min="0" required value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></label>
          <label className="text-sm"><span className="mb-1 block text-slate-600">মন্তব্য</span>
            <input className="input" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} /></label>
          {err && <p className="col-span-full text-sm text-red-700">{err}</p>}
          <div className="col-span-full flex gap-2">
            <button className="btn-primary" type="submit">সংরক্ষণ</button>
            <button className="btn-ghost" type="button" onClick={() => setForm(null)}>বাতিল</button>
          </div>
        </form>
      )}

      <div className="mb-3 flex gap-3">
        <div className="card flex-1 text-center"><p className="text-xs text-slate-500">মোট আয়</p><p className="font-bold text-green-600">{taka(totalIncome)}</p></div>
        <div className="card flex-1 text-center"><p className="text-xs text-slate-500">মোট ব্যয়</p><p className="font-bold text-red-600">{taka(totalExpense)}</p></div>
        <div className="card flex-1 text-center"><p className="text-xs text-slate-500">নিট</p><p className={`font-bold ${totalIncome - totalExpense >= 0 ? 'text-green-600' : 'text-red-600'}`}>{taka(totalIncome - totalExpense)}</p></div>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full">
          <thead><tr><th className="th">তারিখ</th><th className="th">ধরন</th><th className="th">খাত</th><th className="th">উৎস</th><th className="th">পরিমাণ</th><th className="th">মন্তব্য</th><th className="th" /></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td className="td" colSpan={7}>কোনো এন্ট্রি নেই</td></tr>}
            {rows.map(r => (
              <tr key={r._id} className="hover:bg-field">
                <td className="td">{day(r.date)}</td>
                <td className="td"><span className={`rounded px-2 py-0.5 text-xs font-medium ${r.kind === 'INCOME' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{r.kind === 'INCOME' ? 'আয়' : 'ব্যয়'}</span></td>
                <td className="td">{r.category}</td>
                <td className="td"><span className={`rounded px-2 py-0.5 text-xs ${r.source === 'MANUAL' ? 'bg-slate-100 text-slate-700' : 'bg-blue-100 text-blue-700'}`}>{r.source === 'MANUAL' ? 'ম্যানুয়াল' : 'স্বয়ংক্রিয়'}</span></td>
                <td className="td font-semibold">{taka(Number(r.amount || 0))}</td>
                <td className="td text-slate-500">{r.note}</td>
                <td className="td text-right">
                  {r.source === 'MANUAL' && <>
                    <button className="btn-ghost px-2" onClick={() => { setErr(''); setForm({ _id: r._id, date: day(r.date), kind: r.kind, category: r.category, amount: r.amount, note: r.note || '' }); }}><Pencil size={14} /></button>
                    <button className="btn-ghost px-2 text-red-600" onClick={() => remove(r._id)}><Trash2 size={14} /></button>
                  </>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
