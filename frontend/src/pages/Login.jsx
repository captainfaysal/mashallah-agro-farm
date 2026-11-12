import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth';

export default function Login() {
  const { t } = useTranslation();
  const { user, login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  if (user) return <Navigate to="/app" replace />;

  const submit = async (e) => {
    e.preventDefault();
    try { await login(email, password); nav('/app'); } catch (e2) { setErr(e2.message); }
  };

  return (
    <div className="grid min-h-screen place-items-center p-4">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4">
        <img src="/logo.jpeg" alt="" className="mx-auto h-24 w-24 rounded-full" />
        <h1 className="text-center text-lg font-semibold text-forest">{t('Owner sign in')}</h1>
        <label className="block text-sm"><span className="mb-1 block">{t('Email')}</span>
          <input className="input" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label className="block text-sm"><span className="mb-1 block">{t('Password')}</span>
          <input className="input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        {err && <p role="alert" className="text-sm text-red-700">{t(err)}</p>}
        <button className="btn-primary w-full justify-center" type="submit">{t('Sign in')}</button>
      </form>
    </div>
  );
}
