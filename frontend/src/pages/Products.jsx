import { useEffect, useState } from 'react';
import api from '../api';
import { Plus, Trash2, Pencil } from 'lucide-react';

export default function Products() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(null);
  const [err, setErr] = useState('');

  const load = () => api.get('/products').then(setRows).catch(e => setErr(e.message));
  useEffect(() => { load(); }, []);

  const save = async (e) => {
    e.preventDefault(); setErr('');
    try {
      if (form._id) await api.put(`/products/${form._id}`, { name: form.name, unit: form.unit });
      else await api.post('/products', { name: form.name, unit: form.unit });
      setForm(null); load();
    } catch (e2) { setErr(e2.message); }
  };

  const remove = async (id) => { if (!confirm('মুছবেন?')) return; await api.del(`/products/${id}`); load(); };

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <h1 className="text-xl font-semibold text-forest">পণ্য তালিকা</h1>
        <button className="btn-primary ml-auto" onClick={() => { setErr(''); setForm({ name: '', unit: 'kg' }); }}><Plus size={16} />নতুন পণ্য</button>
      </div>
      {err && !form && <p className="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">{err}</p>}

      {form && (
        <form onSubmit={save} className="card mb-4 flex flex-wrap gap-3 items-end">
          <label className="text-sm"><span className="mb-1 block text-slate-600">পণ্যের নাম</span>
            <input className="input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
          <label className="text-sm"><span className="mb-1 block text-slate-600">একক</span>
            <input className="input w-24" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} /></label>
          {err && <p className="w-full text-sm text-red-700">{err}</p>}
          <button className="btn-primary" type="submit">সংরক্ষণ</button>
          <button className="btn-ghost" type="button" onClick={() => setForm(null)}>বাতিল</button>
        </form>
      )}

      <div className="card overflow-x-auto p-0">
        <table className="w-full">
          <thead><tr><th className="th">পণ্যের নাম</th><th className="th">একক</th><th className="th" /></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td className="td" colSpan={3}>কোনো পণ্য নেই</td></tr>}
            {rows.map(r => (
              <tr key={r._id} className="hover:bg-field">
                <td className="td font-medium">{r.name}</td>
                <td className="td">{r.unit}</td>
                <td className="td text-right">
                  <button className="btn-ghost px-2" onClick={() => { setErr(''); setForm({ _id: r._id, name: r.name, unit: r.unit }); }}><Pencil size={14} /></button>
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
