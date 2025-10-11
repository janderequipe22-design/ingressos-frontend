import { useState } from 'react';
import api from '../lib/api';
import { setToken } from '../lib/auth';
import { useRouter } from 'next/router';

export default function CheckerLogin(){
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submit(){
    setLoading(true);
    try{
      const r = await api.post('/checkers/login', { user, password });
      setToken(r.data?.token);
      router.push('/validator');
    }catch(e){
      alert(e?.response?.data?.error || 'Falha no login do checador');
    }finally{ setLoading(false); }
  }

  return (
    <div style={{minHeight:'60vh', display:'grid', placeItems:'center', padding:16}}>
      <style dangerouslySetInnerHTML={{__html: `.nav{display:none!important}.footer{display:none!important}`}} />
      <div style={{width:'100%', maxWidth:380, background:'#fff', border:'1px solid #e5e7eb', borderRadius:12, padding:16}}>
        <h1 style={{marginTop:0}}>Login do Checador</h1>
        <div style={{display:'grid', gap:10}}>
          <div>
            <label style={{display:'block', fontSize:12, color:'#6b7280'}}>Usuário ou Email</label>
            <input value={user} onChange={e=>setUser(e.target.value)} placeholder="usuario ou email" style={{width:'100%', padding:'10px 12px', border:'1px solid #e5e7eb', borderRadius:8}} />
          </div>
          <div>
            <label style={{display:'block', fontSize:12, color:'#6b7280'}}>Senha</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" style={{width:'100%', padding:'10px 12px', border:'1px solid #e5e7eb', borderRadius:8}} />
          </div>
          <button disabled={loading} onClick={submit} style={{background:'#111827', color:'#fff', border:0, padding:'10px 14px', borderRadius:10, fontWeight:800}}>
            {loading? 'Entrando...' : 'Entrar'}
          </button>
          <div style={{fontSize:12, color:'#6b7280'}}>Após entrar, você será redirecionado para o Validador.</div>
        </div>
      </div>
    </div>
  );
}
