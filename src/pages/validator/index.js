import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import api from '../../lib/api';

export default function ValidatorPage(){
  const router = useRouter();
  const { id } = router.query || {};
  const [loading, setLoading] = useState(true);
  const [ticket, setTicket] = useState(null);
  const [error, setError] = useState('');
  const [using, setUsing] = useState(false);
  const [message, setMessage] = useState('');

  async function fetchTicket(tid){
    setLoading(true);
    setError(''); setMessage('');
    try{ const r = await api.get(`/tickets/${encodeURIComponent(tid)}`); setTicket(r.data); }
    catch(e){ setError(e?.response?.data?.error || 'Bilhete não encontrado'); }
    finally{ setLoading(false); }
  }

  useEffect(()=>{ if (!router.isReady) return; if (id) fetchTicket(id); }, [router.isReady, id]);

  async function doUse(){
    if (!id) return;
    setUsing(true); setMessage(''); setError('');
    try{
      const r = await api.post(`/tickets/${encodeURIComponent(id)}/use`);
      if (r?.data?.ok){ setMessage('Ingresso validado com sucesso.'); fetchTicket(id); }
      else { setError(r?.data?.message || 'Falha ao validar ingresso'); }
    }catch(e){ setError(e?.response?.data?.error || 'Falha ao validar ingresso'); }
    finally{ setUsing(false); }
  }

  return (
    <div style={{minHeight:'100vh', display:'grid', placeItems:'center', background:'#0f172a', color:'#e5e7eb'}}>
      <div style={{background:'#111827', border:'1px solid #374151', borderRadius:12, padding:16, width:'min(680px, 94vw)'}}>
        <h1 style={{margin:'4px 0 10px 0'}}>Validador de Ingressos</h1>
        {!id && (
          <div>Link inválido: parâmetro id ausente.</div>
        )}
        {id && (
          <div>
            <div style={{fontSize:12, color:'#9ca3af'}}>Ticket ID</div>
            <div style={{fontFamily:'monospace', fontSize:13, color:'#d1d5db'}}>{id}</div>

            {loading ? (
              <div style={{marginTop:12}}>Carregando...</div>
            ) : error ? (
              <div style={{marginTop:12, color:'#fca5a5'}}>{error}</div>
            ) : ticket ? (
              <div style={{marginTop:12, background:'#0b1220', border:'1px solid #1f2937', borderRadius:10, padding:12}}>
                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8}}>
                  <div><b>Evento:</b> {ticket.eventName || '-'}</div>
                  <div><b>Tipo:</b> {ticket.ticketTypeName || '-'}</div>
                  <div><b>Código:</b> <span style={{fontFamily:'monospace'}}>{ticket.code}</span></div>
                  <div><b>Status:</b> <span style={{color: ticket.status==='used' ? '#f87171' : '#34d399'}}>{ticket.status}</span></div>
                </div>
                <div style={{marginTop:12, display:'flex', gap:8}}>
                  <button disabled={using || ticket.status==='used'} onClick={doUse} style={{background:'#10b981', color:'#0b1220', border:0, padding:'10px 14px', borderRadius:10, fontWeight:800}}>
                    {using ? 'Validando...' : (ticket.status==='used' ? 'Já utilizado' : 'Validar/Usar')}
                  </button>
                  <button onClick={()=>fetchTicket(id)} style={{background:'#f3f4f6', color:'#111827', border:0, padding:'10px 14px', borderRadius:10, fontWeight:800}}>Atualizar</button>
                </div>
                {message && <div style={{marginTop:8, color:'#a7f3d0'}}>{message}</div>}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
