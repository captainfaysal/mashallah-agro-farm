import { useEffect, useState } from 'react';
import api, { taka, day } from '../api';
import { Plus, Trash2, Pencil } from 'lucide-react';

const empty = () => ({ supplyDate: day(new Date()), partyId: '', items: [{ productId: '', purchaseId: '', crates: 0, weightKg: '', allocatedCost: 0, expectedAmount: '' }], note: '' });

export default function Supplies() {
  const [rows, setRows] = useState([]);
  const [parties, setParties] = useState([]);
  const [products, setProducts] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [form, setForm] = useState(null);
  const [err, setErr] = useState('');

  const load = () => api.get('/supplies').then(setRows).catch(e => setErr(e.message));
  useEffect(() => {
    load();
    api.get('/parties').then(setParties);
    api.get('/products').then(setProducts);
    api.get('/purchases').then(setPurchases);
  }, []);

  const setItem = (i, k, v) => setForm(f => { const items = [...f.items]; items[i] = { ...items[i], [k]: v }; return { ...f, items }; });
  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { productId: '', purchaseId: '', crates: 0, weightKg: '', allocatedCost: 0, expectedAmount: '' }] }));
  const removeItem = (i) => setForm(f => ({ ...f, items: f.items.filter((_, j) => j !== i) }));

  const save = async (e) => {
    e.preventDefault(); setErr('');
    try {
      const body = {
        ...form,
        items: form.items.map(i => ({ ...i, crates: Number(i.crates), weightKg: Number(i.weightKg), allocatedCost: Number(i.allocatedCost || 0), expectedAmount: Number(i.expectedAmount || 0), ...(i.purchaseId ? {} : { purchaseId: undefined }) })),
      };
      if (form._id) await api.put(`/supplies/${form._id}`, body);
      else await api.post('/supplies', body);
      setForm(null); load();
    } catch (e2) { setErr(e2.message); }
  };

  const remove = async (id) => { if (!confirm('মুছবেন?')) return; await api.del(`/supplies/${id}`); load(); };

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <h1 className="text-xl font-semibold text-forest">সরবরাহ ব্যবস্থাপনা</h1>
        <button className="btn-primary ml-auto" onClick={() => { setErr(''); setForm(empty()); }}><Plus size={16} />নতুন সরবরাহ</button>
      </div>
      {err && <p className="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">{err}</p>}

      {form && (
        <form onSubmit={save} className="card mb-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-sm"><span className="mb-1 block text-slate-600">তারিখ</span>
              <input className="input" type="date" required value={form.supplyDate} onChange={e => setForm({ ...form, supplyDate: e.target.value })} /></label>
            <label className="text-sm"><span className="mb-1 block text-slate-600">পার্টি</span>
              <select className="input" required value={form.partyId} onChange={e => setForm({ ...form, partyId: e.target.value })}>
                <option value="">—</option>
                {parties.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
              </select></label>
            <label className="text-sm"><span className="mb-1 block text-slate-600">মন্তব্য</span>
              <input className="input" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} /></label>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr><th className="th">পণ্য</th><th className="th">ক্রয় রেফ</th><th className="th">ক্রেট</th><th className="th">ওজন (কেজি)</th><th className="th">বরাদ্দ খরচ</th><th className="th">প্রত্যাশিত পরিমাণ</th><th className="th" /></tr></thead>
              <tbody>
                {form.items.map((it, i) => (
                  <tr key={i}>
                    <td className="td"><select className="input" required value={it.productId} onChange={e => setItem(i, 'productId', e.target.value)}>
                      <option value="">—</option>
                      {products.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                    </select></td>
                    <td className="td"><select className="input" value={it.purchaseId} onChange={e => setItem(i, 'purchaseId', e.target.value)}>
                      <option value="">—</option>
                      {purchases.map(p => <option key={p._id} value={p._id}>{day(p.purchaseDate)} – {p.supplierName}</option>)}
                    </select></td>
                    <td className="td"><input className="input w-20" type="number" min="0" value={it.crates} onChange={e => setItem(i, 'crates', e.target.value)} /></td>
                    <td className="td"><input className="input w-28" type="number" step="0.01" required value={it.weightKg} onChange={e => setItem(i, 'weightKg', e.target.value)} /></td>
                    <td className="td"><input className="input w-28" type="number" step="0.01" min="0" value={it.allocatedCost} onChange={e => setItem(i, 'allocatedCost', e.target.value)} /></td>
                    <td className="td"><input className="input w-28" type="number" step="0.01" min="0" required value={it.expectedAmount} onChange={e => setItem(i, 'expectedAmount', e.target.value)} /></td>
                    <td className="td"><button type="button" className="btn-ghost px-2 text-red-600" onClick={() => removeItem(i)}><Trash2 size={14} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button type="button" className="btn-ghost mt-2 text-sm" onClick={addItem}><Plus size={14} />পণ্য যোগ করুন</button>
          </div>

          {err && <p className="text-sm text-red-700">{err}</p>}
          <div className="flex gap-2"><button className="btn-primary" type="submit">সংরক্ষণ</button><button className="btn-ghost" type="button" onClick={() => setForm(null)}>বাতিল</button></div>
        </form>
      )}

      <div className="card overflow-x-auto p-0">
        <table className="w-full">
          <thead><tr><th className="th">তারিখ</th><th className="th">পার্টি</th><th className="th">পণ্য</th><th className="th">মোট কেজি</th><th className="th">ক্রেট</th><th className="th">প্রত্যাশিত</th><th className="th" /></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td className="td" colSpan={7}>কোনো রেকর্ড নেই</td></tr>}
            {rows.map(r => (
              <tr key={r._id} className="hover:bg-field">
                <td className="td">{day(r.supplyDate)}</td>
                <td className="td">{r.partyId?.name}</td>
                <td className="td">{r.items?.map(i => `${i.productId?.name} ${i.weightKg}kg`).join(', ')}</td>
                <td className="td">{r.totalWeightKg} kg</td>
                <td className="td">{r.totalCrates}</td>
                <td className="td font-semibold">{taka(r.totalExpectedAmount)}</td>
                <td className="td text-right">
                  <button className="btn-ghost px-2" onClick={() => { setErr(''); setForm({ ...r, _id: r._id, supplyDate: day(r.supplyDate), partyId: r.partyId?._id || r.partyId, items: r.items.map(i => ({ ...i, productId: i.productId?._id || i.productId, purchaseId: i.purchaseId || '' })) }); }}><Pencil size={14} /></button>
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
