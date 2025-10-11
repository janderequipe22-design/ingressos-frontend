import DashboardLayout from '../../../components/dashboard/DashboardLayout';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import api from '../../../lib/api';
import { getToken } from '../../../lib/auth';

export default function EventsPage(){
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [publicEvents, setPublicEvents] = useState([]);

  useEffect(()=>{ setMounted(true); }, []);

  useEffect(()=>{
    const token = getToken();
    if(!mounted) return;
    if(!token){ setLoading(false); return; }
    try {
      // decode JWT payload (no verify) just to show email (best effort)
      const payload = JSON.parse(atob(token.split('.')[1] || 'e30='));
      if (payload?.email) setUserEmail(payload.email);
    } catch {}
    setLoading(true);
    setError('');
    api.get('/events/mine')
      .then(r=>setEvents(r.data))
      .catch(e=>{ setError(e?.response?.data?.error || 'Falha ao carregar eventos'); })
      .finally(()=>setLoading(false));
    // Load public events (best effort) to allow claiming
    api.get('/events').then(r=>setPublicEvents(r.data||[])).catch(()=>{});
  },[mounted]);

  if(!mounted){
    return <DashboardLayout title="Eventos"><div /></DashboardLayout>;
  }

  if(!getToken()){
    return (
      <DashboardLayout title="Eventos">
        <div>Você precisa fazer login no <Link href="/dashboard">Dashboard</Link>.</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Eventos">
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12}}>
        <div style={{fontWeight:500, fontSize:24}}>Meus eventos {userEmail ? <span style={{color:'#6b7280', fontWeight:400, fontSize:14}}>(logado: {userEmail})</span> : null}</div>
        <Link href="/dashboard" legacyBehavior>
          <a style={{background:'#111827', color:'#fff', borderRadius:8, padding:'8px 12px', textDecoration:'none'}}>+ Novo Evento</a>
        </Link>
      </div>
      <div style={{display:'flex', gap:8, marginBottom:8}}>
        <button onClick={()=>{
          setLoading(true); setError('');
          api.get('/events/mine').then(r=>setEvents(r.data)).catch(e=>setError(e?.response?.data?.error || 'Falha ao carregar eventos')).finally(()=>setLoading(false));
        }} style={{border:'1px solid #e5e7eb', background:'#fff', borderRadius:8, padding:'6px 10px'}}>Recarregar</button>
      </div>
      {loading ? (
        <div>Carregando...</div>
      ) : error ? (
        <div style={{color:'#b91c1c'}}>Erro: {error}</div>
      ) : events.length === 0 ? (
        <div>Nenhum evento. Clique em “+ Novo Evento”.</div>
      ) : (
        <div style={{display:'grid', gap:12}}>
          {events.map(ev => (
            <div key={ev._id} style={{background:'#fff', border:'1px solid #e5e7eb', borderRadius:8, padding:12}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <div>
                  <div style={{fontWeight:500, fontSize:17, lineHeight:1.2}}>{ev.name}</div>
                  <div style={{color:'#6b7280', fontSize:14}}>{new Date(ev.date).toLocaleString()} — {ev.location}</div>
                </div>
                <div style={{display:'flex', gap:8}}>
                  <Link href={`/dashboard/events/${ev._id}/gallery`} legacyBehavior>
                    <a style={{border:'1px solid #e5e7eb', borderRadius:8, padding:'6px 10px', textDecoration:'none'}}>Galeria</a>
                  </Link>
                  <Link href={`/dashboard`} legacyBehavior>
                    <a style={{border:'1px solid #e5e7eb', borderRadius:8, padding:'6px 10px', textDecoration:'none'}}>Editar</a>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Public events that are not mine (allow claiming) */}
      <div style={{marginTop:20}}>
        <div style={{fontWeight:500, marginBottom:8, fontSize:18}}>Eventos públicos (não atribuídos)</div>
        <div style={{display:'grid', gap:10}}>
          {publicEvents
            .filter(pe => !events.some(me => me._id === pe._id))
            .map(pe => (
              <div key={pe._id} style={{background:'#fff', border:'1px dashed #e5e7eb', borderRadius:8, padding:12}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                  <div>
                    <div style={{fontWeight:500, fontSize:16}}>{pe.name}</div>
                    <div style={{color:'#6b7280', fontSize:14}}>{new Date(pe.date).toLocaleString()} — {pe.location}</div>
                  </div>
                  <div>
                    <button title="Transferir este evento para minha conta" onClick={async()=>{
                      try {
                        await api.post(`/events/${pe._id}/claim`);
                        const r = await api.get('/events/mine');
                        setEvents(r.data);
                      } catch (e) { alert(e?.response?.data?.error || 'Falha ao reivindicar'); }
                    }} style={{border:'1px solid #10b981', color:'#065f46', background:'#ecfdf5', borderRadius:8, padding:'6px 10px'}}>Vincular a mim</button>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
