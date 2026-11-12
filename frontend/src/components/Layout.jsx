import { NavLink, Outlet, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LayoutDashboard, ShoppingCart, Truck, Handshake, Wallet, Users, Package, BookOpen, Beef, Box, FileText, LogOut } from 'lucide-react';
import { useAuth } from '../auth';

const NAV = [
  ['/app', 'ড্যাশবোর্ড', LayoutDashboard, true],
  ['/app/purchases', 'ক্রয়', ShoppingCart],
  ['/app/supplies', 'সরবরাহ', Truck],
  ['/app/settlements', 'হিসাব নিষ্পত্তি', Handshake],
  ['/app/payments', 'পেমেন্ট', Wallet],
  ['/app/crates', 'ক্রেট', Box],
  ['/app/parties', 'পার্টি', Users],
  ['/app/products', 'পণ্য', Package],
  ['/app/daybook', 'দৈনিক খাতা', BookOpen],
  ['/app/cattle', 'গরু', Beef],
  ['/app/reports/daily', 'দৈনিক রিপোর্ট', FileText],
];

export function LangToggle({ className = '' }) {
  const { i18n } = useTranslation();
  const next = i18n.language === 'bn' ? 'en' : 'bn';
  return <button className={`btn-ghost ${className}`} onClick={() => i18n.changeLanguage(next)}>{next === 'en' ? 'English' : 'বাংলা'}</button>;
}

export default function Layout() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  return (
    <div className="min-h-screen md:flex">
      <aside className="bg-forest text-white md:min-h-screen md:w-56 md:shrink-0">
        <Link to="/" className="flex items-center gap-3 p-4">
          <img src="/logo.jpeg" alt="" className="h-10 w-10 rounded-full bg-white" />
          <span className="font-semibold leading-tight text-sm">মাশাল্লাহ<br />এগ্রো ফার্ম</span>
        </Link>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:pb-4">
          {NAV.map(([to, label, Icon, end]) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) => `flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm ${isActive ? 'bg-white text-forest font-semibold' : 'text-white/85 hover:bg-white/10'}`}>
              <Icon size={15} />{t(label)}
            </NavLink>
          ))}
        </nav>
        <div className="hidden items-center gap-2 border-t border-white/15 p-3 text-sm md:flex">
          <span className="truncate">{user?.name}</span>
          <LangToggle className="ml-auto !text-white hover:!bg-white/10" />
          <button className="btn-ghost !text-white hover:!bg-white/10 px-2" onClick={logout}><LogOut size={16} /></button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-4 md:p-6">
        <div className="no-print mb-3 flex justify-end gap-2 md:hidden">
          <LangToggle />
          <button className="btn-ghost" onClick={logout}><LogOut size={16} />{t('Sign out')}</button>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
