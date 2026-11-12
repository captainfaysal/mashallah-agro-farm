import { useEffect, useState } from 'react';
import api, { taka, day } from '../api';
import { Plus, Trash2, Pencil } from 'lucide-react';

function SimplePage({ title, endpoint, fields, columns, buildBody }) {
  const [rows, setRows] = useState([]);
  const [opts, setOpts] = useState({});
  const [form, setForm] = useState(null);
  const [err, setErr] = useState('');

  const load = () => api.get(endpoint).then(setRows).catch(e => setErr(e.message));
  useEffect(() => {
    load();
    fields.filter(f => f.from).forEach(f =>
      api.get(f.from).then(list => setOpts(o => ({ ...o, [f.name]: list })))
    );
  }, []);

  const blank = () => Object.fromEntries(fields.map(f => [f.name, f.type === 'date' ? day(new Date()) : '']));

  const save = async (e) => {
    e.preventDefault(); setErr('');
    try {
      const body = buildBody ? buildBody(form) : form;
      if (form._id) await api.put(`${endpoint}/${form._id}`, body);
      else await api.post(endpoint, body);
      setForm(null); load();
    } catch (e2) { setErr(e2.message); }
  };

  const remove = async (id) => { if (!confirm('মুছবেন?')) return; await api.del(`${endpoint}/${id}`); load(); };

  const editRow = (r) => {
    const f = { _id: r._id };
    for (const field of fields) {
      if (field.type === 'date') f[field.name] = day(r[field.name]);
      else if (field.from) f[field.name] = r[field.name]?._id || r[field.name] || '';
      else f[field.name] = r[field.name] ?? '';
    }
    setForm(f);
  };

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <h1 className="text-xl font-semibold text-forest">{title}</h1>
        <button className="btn-primary ml-auto" onClick={() => { setErr(''); setForm(blank()); }}><Plus size={16} />নতুন</button>
      </div>
      {err && !form && <p className="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">{err}</p>}

      {form && (
        <form onSubmit={save} className="card mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {fields.map(f => (
            <label key={f.name} className="text-sm">
              <span className="mb-1 block text-slate-600">{f.label}</span>
              {f.from ? (
                <select className="input" required={!f.optional} value={form[f.name]} onChange={e => setForm({
                  ...form,
                  [f.name]: e.target.value,
                  ...Object.fromEntries(fields.filter(field => field.filterBy?.field === f.name).map(field => [field.name, ''])),
                })}>
                  <option value="">—</option>
                  {(opts[f.name] || [])
                    .filter(o => !f.filterBy || !form[f.filterBy.field] || String(o[f.filterBy.key]?._id || o[f.filterBy.key]) === String(form[f.filterBy.field]))
                    .map(o => <option key={o._id} value={o._id}>{o[f.labelKey || 'name']}</option>)}
                </select>
              ) : f.options ? (
                <select className="input" required={!f.optional} value={form[f.name]} onChange={e => setForm({ ...form, [f.name]: e.target.value })}>
                  <option value="">—</option>
                  {f.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : (
                <input className="input" type={f.type || 'text'} step={f.type === 'number' ? '0.01' : undefined} required={!f.optional}
                  value={form[f.name]} onChange={e => setForm({ ...form, [f.name]: e.target.value })} />
              )}
            </label>
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
          <thead><tr>{columns.map(c => <th key={c.label} className="th">{c.label}</th>)}<th className="th" /></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td className="td" colSpan={columns.length + 1}>কোনো রেকর্ড নেই</td></tr>}
            {rows.map(r => (
              <tr key={r._id} className="hover:bg-field">
                {columns.map(c => <td key={c.label} className="td">{c.render ? c.render(r) : r[c.key] ?? ''}</td>)}
                <td className="td text-right">
                  <button className="btn-ghost px-2" onClick={() => { setErr(''); editRow(r); }}><Pencil size={14} /></button>
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

export function Settlements() {
  return (
    <>
      <p className="mb-3 rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900">
        পার্টি সরবরাহের মাল বিক্রির হিসাব দিলে, এখানে সেই সরবরাহের রেফারেন্সসহ ফার্মের চূড়ান্ত প্রাপ্য লিখুন। এতে পার্টির বকেয়া সমন্বয় হবে; টাকা হাতে পেলে আলাদাভাবে পেমেন্টে যোগ করবেন।
      </p>
      <SimplePage
        title="হিসাব নিষ্পত্তি"
        endpoint="/settlements"
        fields={[
          { name: 'settlementDate', label: 'তারিখ', type: 'date' },
          { name: 'partyId', label: 'পার্টি', from: '/parties' },
          { name: 'supplyId', label: 'সরবরাহ রেফ', from: '/supplies', labelKey: '_id', filterBy: { field: 'partyId', key: 'partyId' } },
          { name: 'quantityKg', label: 'পরিমাণ (কেজি)', type: 'number', optional: true },
          { name: 'actualSalesAmount', label: 'পার্টির বিক্রয় মূল্য', type: 'number', optional: true },
          { name: 'agreeableAmount', label: 'ফার্মের চূড়ান্ত প্রাপ্য', type: 'number' },
          { name: 'note', label: 'মন্তব্য', optional: true },
        ]}
        columns={[
          { label: 'তারিখ', render: r => day(r.settlementDate) },
          { label: 'পার্টি', render: r => r.partyId?.name },
          { label: 'পার্টির বিক্রয়', render: r => taka(r.actualSalesAmount) },
          { label: 'ফার্মের প্রাপ্য', render: r => <span className="font-semibold">{taka(r.agreeableAmount)}</span> },
          { label: 'মন্তব্য', key: 'note' },
        ]}
        buildBody={f => ({ ...f, quantityKg: Number(f.quantityKg || 0), actualSalesAmount: Number(f.actualSalesAmount || 0), agreeableAmount: Number(f.agreeableAmount) })}
      />
    </>
  );
}

export function Payments() {
  return <SimplePage
    title="পেমেন্ট"
    endpoint="/payments"
    fields={[
      { name: 'paymentDate', label: 'তারিখ', type: 'date' },
      { name: 'partyId', label: 'পার্টি', from: '/parties' },
      { name: 'amount', label: 'পরিমাণ', type: 'number' },
      { name: 'note', label: 'মন্তব্য', optional: true },
    ]}
    columns={[
      { label: 'তারিখ', render: r => day(r.paymentDate) },
      { label: 'পার্টি', render: r => r.partyId?.name },
      { label: 'পরিমাণ', render: r => <span className="font-semibold text-green-700">{taka(r.amount)}</span> },
      { label: 'মন্তব্য', key: 'note' },
    ]}
    buildBody={f => ({ ...f, amount: Number(f.amount) })}
  />;
}

export function Crates() {
  return <SimplePage
    title="ক্রেট ব্যবস্থাপনা"
    endpoint="/crates"
    fields={[
      { name: 'date', label: 'তারিখ', type: 'date' },
      { name: 'partyId', label: 'পার্টি', from: '/parties' },
      { name: 'direction', label: 'ধরন', options: [{ value: 'SENT', label: 'পাঠানো হয়েছে' }, { value: 'RETURNED', label: 'ফেরত এসেছে' }] },
      { name: 'quantity', label: 'সংখ্যা', type: 'number' },
      { name: 'note', label: 'মন্তব্য', optional: true },
    ]}
    columns={[
      { label: 'তারিখ', render: r => day(r.date) },
      { label: 'পার্টি', render: r => r.partyId?.name },
      { label: 'ধরন', render: r => r.direction === 'SENT' ? <span className="text-orange-600">পাঠানো</span> : <span className="text-green-600">ফেরত</span> },
      { label: 'সংখ্যা', render: r => <span className="font-semibold">{r.quantity}</span> },
      { label: 'মন্তব্য', key: 'note' },
    ]}
    buildBody={f => ({ ...f, quantity: Number(f.quantity) })}
  />;
}
