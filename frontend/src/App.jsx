import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth';
import Layout from './components/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Purchases from './pages/Purchases';
import Supplies from './pages/Supplies';
import { Settlements, Payments, Crates } from './pages/Settlements';
import { Parties, PartyLedger } from './pages/Parties';
import Products from './pages/Products';
import DailyReport from './pages/DailyReport';
import Daybook from './pages/Daybook';
import { Cattle, CattleCosts } from './pages/Resources';

function Protected({ children }) {
  const { user } = useAuth();
  if (user === undefined) return <p className="p-6">লোড হচ্ছে…</p>;
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/app" element={<Protected><Layout /></Protected>}>
        <Route index element={<Dashboard />} />
        <Route path="purchases" element={<Purchases />} />
        <Route path="supplies" element={<Supplies />} />
        <Route path="settlements" element={<Settlements />} />
        <Route path="payments" element={<Payments />} />
        <Route path="crates" element={<Crates />} />
        <Route path="parties" element={<Parties />} />
        <Route path="parties/:id" element={<PartyLedger />} />
        <Route path="products" element={<Products />} />
        <Route path="daybook" element={<Daybook />} />
        <Route path="cattle" element={<Cattle />} />
        <Route path="cattle-expenses" element={<CattleCosts />} />
        <Route path="cattle-costs" element={<CattleCosts />} />
        <Route path="reports/daily" element={<DailyReport />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
