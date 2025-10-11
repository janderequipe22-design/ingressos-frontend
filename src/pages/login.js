import { useState } from 'react';
import api from '../lib/api';
import { setToken } from '../lib/auth';
import { useRouter } from 'next/router';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    setError('');
    setLoading(true);
    try {
      const r = await api.post('/auth/login', { email, password });
      if (r.data?.token) {
        setToken(r.data.token);
        router.push('/dashboard');
      } else {
        setError('Falha no login');
      }
    } catch (e) {
      setError(e?.response?.data?.error || 'Falha no login');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{minHeight:'100vh', display:'grid', placeItems:'center', background:'#f5f6f8', padding:16}}>
      <div style={{width:'100%', maxWidth:420, background:'#fff', border:'1px solid #e5e7eb', borderRadius:12, padding:20}}>
        <h1 style={{margin:'0 0 12px 0'}}>Login</h1>
        <div style={{display:'grid', gap:10}}>
          <input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} style={{width:'100%', padding:'10px 12px', border:'1px solid #e5e7eb', borderRadius:8}} />
          <input type="password" placeholder="Senha" value={password} onChange={e=>setPassword(e.target.value)} style={{width:'100%', padding:'10px 12px', border:'1px solid #e5e7eb', borderRadius:8}} />
          <button disabled={loading} onClick={submit} style={{width:'100%', padding:'10px 14px', borderRadius:8, border:0, background:'#111827', color:'#fff', fontWeight:700}}>{loading? 'Entrando...' : 'Entrar'}</button>
          {error && <div style={{color:'#991b1b', background:'#fef2f2', border:'1px solid #fecaca', borderRadius:8, padding:'8px 10px'}}>{error}</div>}
        </div>
      </div>
    </div>
  );
}
