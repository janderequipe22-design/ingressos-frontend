import { useState } from 'react';
import api from '../lib/api';

export default function Contato(){
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function submit(e){
    e.preventDefault();
    setSending(true); setError('');
    try{
      await api.post('/contact', { name, email, whatsapp, subject, message });
      setSent(true);
      setName(''); setEmail(''); setWhatsapp(''); setSubject(''); setMessage('');
    }catch(err){
      setError(err?.response?.data?.error || 'Falha ao enviar. Tente novamente.');
    }finally{ setSending(false); }
  }

  return (
    <div>
      <div style={{maxWidth:720, margin:'24px auto', padding:'0 16px'}}>
        <h1>Contato</h1>
        <p>Use o formulário abaixo para falar com nossa equipe. Responderemos o quanto antes.</p>
        <form onSubmit={submit} style={{display:'grid', gap:12, background:'#fff', border:'1px solid #e5e7eb', borderRadius:12, padding:16}}>
          <div>
            <label style={{display:'block', fontSize:12, color:'#6b7280'}}>Nome</label>
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="Seu nome" style={{width:'100%', padding:'10px 12px', border:'1px solid #e5e7eb', borderRadius:8}}/>
          </div>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
            <div>
              <label style={{display:'block', fontSize:12, color:'#6b7280'}}>Email</label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="seu@email.com" style={{width:'100%', padding:'10px 12px', border:'1px solid #e5e7eb', borderRadius:8}}/>
            </div>
            <div>
              <label style={{display:'block', fontSize:12, color:'#6b7280'}}>WhatsApp</label>
              <input value={whatsapp} onChange={e=>setWhatsapp(e.target.value)} placeholder="(DDD) 9 9999-9999" style={{width:'100%', padding:'10px 12px', border:'1px solid #e5e7eb', borderRadius:8}}/>
            </div>
          </div>
          <div>
            <label style={{display:'block', fontSize:12, color:'#6b7280'}}>Assunto</label>
            <input value={subject} onChange={e=>setSubject(e.target.value)} placeholder="Assunto" style={{width:'100%', padding:'10px 12px', border:'1px solid #e5e7eb', borderRadius:8}}/>
          </div>
          <div>
            <label style={{display:'block', fontSize:12, color:'#6b7280'}}>Mensagem</label>
            <textarea value={message} onChange={e=>setMessage(e.target.value)} placeholder="Escreva sua mensagem" rows={6} style={{width:'100%', padding:'10px 12px', border:'1px solid #e5e7eb', borderRadius:8}}/>
          </div>
          {error && <div style={{color:'#b91c1c'}}>{error}</div>}
          {sent && <div style={{color:'#065f46'}}>Mensagem enviada com sucesso.</div>}
          <div style={{display:'flex', justifyContent:'flex-end'}}>
            <button disabled={sending} style={{background:'#111827', color:'#fff', border:0, padding:'10px 14px', borderRadius:10, fontWeight:700}}>{sending? 'Enviando...' : 'Enviar'}</button>
          </div>
        </form>
        <div style={{marginTop:16, color:'#6b7280', fontSize:13}}>
          Também atendemos por e-mail em <a href={`mailto:${process.env.NEXT_PUBLIC_CONTACT_EMAIL||''}`}>{process.env.NEXT_PUBLIC_CONTACT_EMAIL||'seu@email.com'}</a>.
        </div>
      </div>
    </div>
  );
}
