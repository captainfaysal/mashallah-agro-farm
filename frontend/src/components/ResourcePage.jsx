import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import api, { day } from '../api';

const today = () => new Date().toISOString().slice(0, 10);

// Generic list + add/edit form for one API resource.
// fields: { name, label, type: text|number|date|select, options | from + labelKey, required }
export default function ResourcePage({ title, endpoint, columns, fields }) {
  const { t } = useTranslation();
  const [rows, setRows] = useState(null);
  const [opts, setOpts] = useState({});
  const [form, setForm] = useState(null);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');

  const load = useCallback(() => api.get(endpoint).then(setRows).catch((e) => setErr(e.message)), [endpoint]);

  useEffect(() => {
    load();
    fields.filter((f) => f.from).forEach((f) =>
      api.get(f.from).then((list) =>
        setOpts((o) => ({ ...o, [f.name]: list.map((x) => ({ value: x._id || x.id, label: x[f.labelKey || 'name'] })) }))
      )
    );
  }, [load]);

  const blank = () => Object.fromEntries(fields.map((f) => [f.name, f.type === 'date' && !f.optional ? today() : f.options && !f.optional ? f.options[0].value : '']));
  const edit = (row) => setForm({ id: row._id || row.id, ...Object.fromEntries(fields.map((f) => [f.name, f.type === 'date' ? day(row[f.name]) : row[f.name] ?? ''])) });

  const save = async (e) => {
    e.preventDefault();
    setErr('');
    const body = {};
    for (const f of fields) {
      const v = form[f.name];
      if (v === '' || v == null) continue;
      body[f.name] = f.type === 'number' ? Number(v) : v;
    }
    try {
      if (form.id) await api.put(`${endpoint}/${form.id}`, body);
      else await api.post(endpoint, body);

      setForm(null);
      load();
    } catch (e2) { setErr(e2.message); }
  };

  const remove = async (row) => {
    if (!window.confirm(t('Delete this record?'))) return;
    try { await api.del(`${endpoint}/${row._id || row.id}`); load(); } catch (e) { setErr(e.message); }
  };

  const shown = (rows || []).filter((r) => !q || JSON.stringify(r).toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold text-forest">{t(title)}</h1>
        <input className="input ml-auto max-w-xs" placeholder={t('Search')} value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn-primary" onClick={() => { setErr(''); setForm(blank()); }}><Plus size={16} />{t('Add')}</button>
      </div>

      {err && !form && <p role="alert" className="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">{err}</p>}

      {form && (
        <form onSubmit={save} className="card mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {fields.map((f) => (
            <label key={f.name} className="text-sm">
              <span className="mb-1 block text-slate-600">{t(f.label)}</span>
              {f.options || f.from ? (
                <select className="input" required={!f.optional} value={form[f.name]} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}>
                  <option value="">—</option>
                  {(f.options || opts[f.name] || []).map((o) => <option key={o.value} value={o.value}>{t(String(o.label))}</option>)}
                </select>
              ) : (
                <input className="input" type={f.type || 'text'} step={f.type === 'number' ? '0.01' : undefined} required={!f.optional}
                  value={form[f.name]} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })} />
              )}
            </label>
          ))}
          {err && <p role="alert" className="col-span-full text-sm text-red-700">{err}</p>}
          <div className="col-span-full flex gap-2">
            <button className="btn-primary" type="submit">{t('Save')}</button>
            <button className="btn-ghost" type="button" onClick={() => setForm(null)}>{t('Cancel')}</button>
          </div>
        </form>
      )}

      <div className="card overflow-x-auto p-0">
        <table className="w-full">
          <thead><tr>{columns.map((c) => <th key={c.label} className="th">{t(c.label)}</th>)}<th className="th" /></tr></thead>
          <tbody>
            {rows === null && <tr><td className="td" colSpan={columns.length + 1}>{t('Loading…')}</td></tr>}
            {rows && shown.length === 0 && <tr><td className="td" colSpan={columns.length + 1}>{t('Nothing here yet. Add the first record.')}</td></tr>}
            {shown.map((r) => (
              <tr key={r.id} className="hover:bg-field">
                {columns.map((c) => <td key={c.label} className="td">{c.render ? c.render(r, t) : r[c.key] ?? ''}</td>)}
                <td className="td text-right">
                  <button className="btn-ghost px-2" aria-label={t('Edit')} onClick={() => { setErr(''); edit(r); }}><Pencil size={15} /></button>
                  <button className="btn-ghost px-2 text-red-700" aria-label={t('Delete')} onClick={() => remove(r)}><Trash2 size={15} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
