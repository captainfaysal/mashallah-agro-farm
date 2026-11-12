import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Beef, Sprout } from 'lucide-react';
import api from '../api';
import { LangToggle } from '../components/Layout';

// Public, read-only page: no money figures are exposed here.
export default function Home() {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  useEffect(() => { api.get('/public/summary').then(setData).catch(() => setData({ products: [], activeCattle: 0 })); }, []);

  return (
    <div className="min-h-screen bg-field">
      <header className="mx-auto flex max-w-5xl items-center justify-end gap-2 p-4">
        <LangToggle />
        <Link to="/login" className="btn-primary">{t('Owner sign in')}</Link>
      </header>
      <main className="mx-auto grid max-w-5xl items-center gap-8 px-4 pb-16 md:grid-cols-[1fr_340px]">
        <div>
          <h1 className="text-5xl font-bold leading-tight text-forest md:text-6xl">মাশাল্লাহ<br />এগ্রো ফার্ম</h1>
          <p className="mt-4 text-xl text-gold">{t('Trust-built, prosperous through farming')}</p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="card flex items-center gap-3">
              <Beef className="text-saffron" />
              <div><div className="text-2xl font-semibold text-forest">{data ? data.activeCattle : '…'}</div><div className="text-sm text-slate-600">{t('Cattle on the farm')}</div></div>
            </div>
            <div className="card">
              <div className="mb-2 flex items-center gap-2 text-sm text-slate-600"><Sprout size={16} className="text-leaf" />{t('Products we deal in')}</div>
              {data && data.products.length === 0 && <p className="text-sm text-slate-500">{t('No products listed yet.')}</p>}
              <div className="flex flex-wrap gap-2">{data?.products.map((p) => <span key={p.name} className="rounded-full bg-forest/10 px-3 py-1 text-sm text-forest">{p.name}</span>)}</div>
            </div>
          </div>
          <p className="mt-6 text-sm text-slate-500">{t('Only the two farm owners can edit records.')}</p>
        </div>
        <img src="/logo.jpeg" alt="মাশাল্লাহ এগ্রো ফার্ম" className="mx-auto w-full max-w-xs rounded-full" />
      </main>
    </div>
  );
}
