import { useEffect, useState } from 'react';
import api, { taka, day } from '../api';
import { Plus, Trash2, Pencil } from 'lucide-react';

const empty = () => ({ purchaseDate: day(new Date()), supplierName: '', items: [{ productId: '', crates: 0, weightKg: '', amount: '' }], transportCost: 0, otherCost: 0, note: '' });

export default function Purchases() {
  const [rows, setRows] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(null);
  const [err, setErr] = useState('');

  const load = () => api.get('/purchases').then(setRows).catch(e => setErr(e.message));
  useEffect(() => { load(); api.get('/products').then(setProducts); }, []);

  const setItem = (i, k, v) => setForm(f => { const items = [...f.items]; items[i] = { ...items[i], [k]: v }; return { ...f, items }; });
  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { productId: '', crates: 0, weightKg: '', amount: '' }] }));
  const removeItem = (i) => setForm(f => ({ ...f, items: f.items.filter((_, j) => j !== i) }));

  const grandTotal = form ? form.items.reduce((s, i) => s + (Number(i.amount) || 0), 0) : 0;
  const landedCost = form ? grandTotal + Number(form.transportCost || 0) + Number(form.otherCost || 0) : 0;

  const save = async (e) => {
    e.preventDefault(); setErr('');
    try {
      const body = { ...form, items: form.items.map(i => ({ ...i, crates: Number(i.crates), weightKg: Number(i.weightKg), amount: Number(i.amount) })), transportCost: Number(form.transportCost), otherCost: Number(form.otherCost) };
      if (form._id) await api.put(`/purchases/${form._id}`, body);
      else await api.post('/purchases', body);
      setForm(null); load();
    } catch (e2) { setErr(e2.message); }
  };

  const remove = async (id) => { if (!confirm('মুছবেন?')) return; await api.del(`/purchases/${id}`); load(); };

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <h1 className="text-xl font-semibold text-forest">ক্রয় ব্যবস্থাপনা</h1>
        <button className="btn-primary ml-auto" onClick={() => { setErr(''); setForm(empty()); }}><Plus size={16} />নতুন ক্রয়</button>
      </div>
      {err && <p className="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">{err}</p>}

      {form && (
        <form onSubmit={save} className="card mb-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-sm"><span className="mb-1 block text-slate-600">তারিখ</span>
              <input className="input" type="date" required value={form.purchaseDate} onChange={e => setForm({ ...form, purchaseDate: e.target.value })} /></label>
            <label className="text-sm"><span className="mb-1 block text-slate-600">সরবরাহকারী/বাজার</span>
              <input className="input" required value={form.supplierName} onChange={e => setForm({ ...form, supplierName: e.target.value })} /></label>
            <label className="text-sm"><span className="mb-1 block text-slate-600">মন্তব্য</span>
              <input className="input" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} /></label>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr><th className="th">পণ্য</th><th className="th">ক্রেট</th><th className="th">ওজন (কেজি)</th><th className="th">মোট টাকা</th><th className="th" /></tr></thead>
              <tbody>
                {form.items.map((it, i) => (
                  <tr key={i}>
                    <td className="td"><select className="input" required value={it.productId} onChange={e => setItem(i, 'productId', e.target.value)}>
                      <option value="">—</option>
                      {products.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                    </select></td>
                    <td className="td"><input className="input w-20" type="number" min="0" value={it.crates} onChange={e => setItem(i, 'crates', e.target.value)} /></td>
                    <td className="td"><input className="input w-28" type="number" step="0.01" required value={it.weightKg} onChange={e => setItem(i, 'weightKg', e.target.value)} /></td>
                    <td className="td"><input className="input w-28" type="number" step="0.01" required value={it.amount} onChange={e => setItem(i, 'amount', e.target.value)} /></td>
                    <td className="td"><button type="button" className="btn-ghost px-2 text-red-600" onClick={() => removeItem(i)}><Trash2 size={14} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button type="button" className="btn-ghost mt-2 text-sm" onClick={addItem}><Plus size={14} />পণ্য যোগ করুন</button>
          </div>

          <div className="grid gap-3 sm:grid-cols-4 border-t pt-3">
            <label className="text-sm"><span className="mb-1 block text-slate-600">পরিবহন খরচ</span>
              <input className="input" type="number" step="0.01" min="0" value={form.transportCost} onChange={e => setForm({ ...form, transportCost: e.target.value })} /></label>
            <label className="text-sm"><span className="mb-1 block text-slate-600">অন্যান্য খরচ</span>
              <input className="input" type="number" step="0.01" min="0" value={form.otherCost} onChange={e => setForm({ ...form, otherCost: e.target.value })} /></label>
            <div className="text-sm"><span className="mb-1 block text-slate-600">পণ্যের মোট</span><p className="font-semibold text-forest">{taka(grandTotal)}</p></div>
            <div className="text-sm"><span className="mb-1 block text-slate-600">সর্বমোট খরচ</span><p className="font-bold text-lg text-forest">{taka(landedCost)}</p></div>
          </div>

          {err && <p className="text-sm text-red-700">{err}</p>}
          <div className="flex gap-2"><button className="btn-primary" type="submit">সংরক্ষণ</button><button className="btn-ghost" type="button" onClick={() => setForm(null)}>বাতিল</button></div>
        </form>
      )}

      <div className="card overflow-x-auto p-0">
        <table className="w-full">
          <thead><tr><th className="th">তারিখ</th><th className="th">সরবরাহকারী</th><th className="th">পণ্য</th><th className="th">মোট ক্রেট</th><th className="th">মোট কেজি</th><th className="th">পণ্য মোট</th><th className="th">সর্বমোট খরচ</th><th className="th" /></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td className="td" colSpan={8}>কোনো রেকর্ড নেই</td></tr>}
            {rows.map(r => (
              <tr key={r._id} className="hover:bg-field">
                <td className="td">{day(r.purchaseDate)}</td>
                <td className="td">{r.supplierName}</td>
                <td className="td">{r.items?.map(i => `${i.productId?.name} ${i.weightKg}kg`).join(', ')}</td>
                <td className="td font-semibold">{r.items?.reduce((sum, item) => sum + Number(item.crates || 0), 0) ?? 0}</td>
                <td className="td">{r.items?.reduce((s, i) => s + i.weightKg, 0)} kg</td>
                <td className="td">{taka(r.totalAmount)}</td>
                <td className="td font-semibold">{taka(r.landedCost)}</td>
                <td className="td text-right">
                  <button className="btn-ghost px-2" onClick={() => { setErr(''); setForm({ ...r, _id: r._id, purchaseDate: day(r.purchaseDate), items: r.items.map(i => ({ ...i, productId: i.productId?._id || i.productId, amount: i.amount })) }); }}><Pencil size={14} /></button>
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
