import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import api from '../../lib/api';

export default function AcceptInvitePage(){
  const router = useRouter();
  const { token } = router.query;
  const [submitting, setSubmitting] = useState(false);
  const [holderName, setHolderName] = useState('');
  const [holderEmail, setHolderEmail] = useState('');
  const [result, setResult] = useState(null);

  useEffect(()=>{
    // Autofill email from mailto deep link if any
    if (typeof window !== 'undefined'){
      try{
        const u = new URL(window.location.href);
        const e = u.searchParams.get('email');
        if (e) setHolderEmail(e);
      }catch{}
    }
  },[]);

  async function accept(){
    if (!token) return;
    if (!holderName || !holderEmail){ alert('Informe seu nome e e-mail.'); return; }
    setSubmitting(true);
    try{
      const r = await api.post(`/invites/${encodeURIComponent(token)}/accept`, { holderName, holderEmail });
      setResult({ ok:true, data:r.data });
      // opção: redirecionar para /me após alguns segundos
      setTimeout(()=>{ router.push('/me'); }, 1500);
    }catch(e){
      const msg = e?.response?.data?.error || 'Falha ao aceitar convite';
      setResult({ ok:false, error: msg });
    }finally{
      setSubmitting(false);
    }
  }

  return (
    <div style={{minHeight:'100vh', padding:16, display:'grid', placeItems:'center', background:'#f3f4f6'}}>
      <div style={{width:'100%', maxWidth:420, background:'#fff', border:'1px solid #e5e7eb', borderRadius:16, padding:16}}>
        <h1 style={{marginTop:0, fontSize:22}}>Aceitar convite</h1>
        <div style={{fontSize:14, color:'#6b7280', marginBottom:12}}>Preencha seus dados para receber o ingresso na sua conta.</div>
        <div style={{display:'grid', gap:10}}>
          <input placeholder="Seu nome" value={holderName} onChange={e=>setHolderName(e.target.value)} style={{padding:'12px 14px', border:'1px solid #e5e7eb', borderRadius:10}}/>
          <input placeholder="Seu e-mail" value={holderEmail} onChange={e=>setHolderEmail(e.target.value)} style={{padding:'12px 14px', border:'1px solid #e5e7eb', borderRadius:10}}/>
          <button onClick={accept} disabled={submitting} style={{padding:'12px 14px', border:0, borderRadius:10, background:'#111827', color:'#fff', fontWeight:700}}>
            {submitting ? 'Enviando...' : 'Aceitar ingresso'}
          </button>
        </div>
        {result && (
          <div style={{marginTop:12, color: result.ok ? '#065f46' : '#991b1b', fontWeight:700}}>
            {result.ok ? 'Convite aceito! Redirecionando…' : result.error}
          </div>
        )}
      </div>
    </div>
  );
}
