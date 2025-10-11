import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import api from '../../lib/api';
import { getToken } from '../../lib/auth';

export default function SalesPage(){
  const [logged, setLogged] = useState(null);
  const [events, setEvents] = useState([]);
  const [eventId, setEventId] = useState('');
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  // period filters
  const [rangeType, setRangeType] = useState('7d'); // 'today' | '7d' | '30d' | 'custom'
  const [from, setFrom] = useState(''); // datetime-local
  const [to, setTo] = useState('');

  useEffect(()=>{ setLogged(!!getToken()); },[]);

  useEffect(()=>{
    if(logged!==true) return;
    (async()=>{
      try{
        const r = await api.get('/events/mine');
        const list = r.data || [];
        setEvents(list);
        if (list.length && !eventId) setEventId(list[0]._id);
      }catch{ setEvents([]); }
    })();
  },[logged]);

  useEffect(()=>{
    if(!eventId) return;
    const { fromISO, toISO } = calcRange(rangeType, from, to);
    setLoading(true);
    const q = new URLSearchParams();
    if (fromISO) q.set('from', fromISO);
    if (toISO) q.set('to', toISO);
    const url = q.toString() ? `/events/${eventId}/metrics?${q.toString()}` : `/events/${eventId}/metrics`;
    api.get(url).then(r=>setMetrics(r.data)).catch(()=>setMetrics(null)).finally(()=>setLoading(false));
  },[eventId, rangeType, from, to]);

  const selectedEvent = useMemo(()=> events.find(e=>e._id===eventId) || null, [events, eventId]);

  const computed = useMemo(()=>{
    if(!metrics || !selectedEvent) return { revenue:0, byType:[], totals:{ totalQty:0, totalSold:0, totalAvailable:0, used:0 } };
    const priceMap = Object.fromEntries((selectedEvent.ticketTypes||[]).map(t=>[t.name, Number(t.price)||0]));
    let revenue = 0;
    const byType = (metrics.byType||[]).map(t=>{
      const price = priceMap[t.name] ?? 0;
      const qty = Number(t.quantity)||0;
      const sold = Number(t.sold)||0;
      const rest = Math.max(qty - sold, 0);
      const rev = sold * price;
      revenue += rev;
      return { name:t.name, price, quantity: qty, sold, remaining: rest, revenue: rev };
    });
    const totals = {
      totalQty: (byType||[]).reduce((s,i)=>s+i.quantity,0),
      totalSold: metrics.totalSold || (byType||[]).reduce((s,i)=>s+i.sold,0),
      totalAvailable: metrics.totalAvailable || 0,
      used: metrics.used || 0,
    };
    return { revenue, byType, totals };
  }, [metrics, selectedEvent]);

  if(logged===null){
    return (
      <DashboardLayout title="Vendas">
        <div>Carregando...</div>
      </DashboardLayout>
    );
  }

  if(!logged){
    return (
      <DashboardLayout title="Vendas">
        <div>Você precisa entrar no <a href="/dashboard">Dashboard</a> para ver os relatórios de vendas.</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Vendas">
      <div style={{display:'grid', gap:12}}>
        <div style={{display:'flex', gap:12, alignItems:'flex-end', flexWrap:'wrap'}}>
          <div>
            <label style={{display:'block', fontSize:12, color:'#6b7280'}}>Evento</label>
            <select value={eventId} onChange={e=>setEventId(e.target.value)} style={{minWidth:280, padding:'10px 12px', border:'1px solid #e5e7eb', borderRadius:8}}>
              {events.map(ev=> (
                <option key={ev._id} value={ev._id}>{ev.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{display:'block', fontSize:12, color:'#6b7280'}}>Período</label>
            <select value={rangeType} onChange={e=>setRangeType(e.target.value)} style={{minWidth:160, padding:'10px 12px', border:'1px solid #e5e7eb', borderRadius:8}}>
              <option value="today">Hoje</option>
              <option value="7d">Últimos 7 dias</option>
              <option value="30d">Últimos 30 dias</option>
              <option value="custom">Personalizado</option>
            </select>
          </div>
          {rangeType==='custom' && (
            <>
              <div>
                <label style={{display:'block', fontSize:12, color:'#6b7280'}}>De</label>
                <input type="datetime-local" value={from} onChange={e=>setFrom(e.target.value)} style={{padding:'10px 12px', border:'1px solid #e5e7eb', borderRadius:8}} />
              </div>
              <div>
                <label style={{display:'block', fontSize:12, color:'#6b7280'}}>Até</label>
                <input type="datetime-local" value={to} onChange={e=>setTo(e.target.value)} style={{padding:'10px 12px', border:'1px solid #e5e7eb', borderRadius:8}} />
              </div>
            </>
          )}
          <div style={{marginLeft:'auto'}}>
            <button onClick={()=>exportCsv(computed)} style={{border:'1px solid #e5e7eb', background:'#fff', borderRadius:8, padding:'10px 12px', fontWeight:700}}>Exportar CSV</button>
          </div>
        </div>

        <div className="kpiGrid">
          <Kpi label="Ingressos vendidos" value={computed.totals.totalSold} />
          <Kpi label="Receita total" value={`R$ ${computed.revenue.toFixed(2)}`} />
          <Kpi label="Disponíveis" value={computed.totals.totalAvailable} />
          <Kpi label="Utilizados" value={computed.totals.used} />
        </div>

        <div style={{background:'#fff', border:'1px solid #e5e7eb', borderRadius:12, overflow:'hidden'}}>
          <div style={{padding:12, borderBottom:'1px solid #e5e7eb', fontWeight:500}}>Vendas por tipo de ingresso</div>
          {loading ? (
            <div style={{padding:12}}>Carregando...</div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="desktopTable">
                <table style={{width:'100%', borderCollapse:'collapse'}}>
                  <thead>
                    <tr style={{background:'#f9fafb', textAlign:'left'}}>
                      <Th>Tipo</Th>
                      <Th>Preço</Th>
                      <Th>Quantidade</Th>
                      <Th>Vendidos</Th>
                      <Th>Restantes</Th>
                      <Th>Receita</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {computed.byType.map((t, idx)=> (
                      <tr key={idx} style={{borderTop:'1px solid #e5e7eb'}}>
                        <Td>{t.name}</Td>
                        <Td>{`R$ ${t.price.toFixed(2)}`}</Td>
                        <Td>{t.quantity}</Td>
                        <Td>{t.sold}</Td>
                        <Td>{t.remaining}</Td>
                        <Td>{`R$ ${t.revenue.toFixed(2)}`}</Td>
                      </tr>
                    ))}
                    {!computed.byType.length && (
                      <tr>
                        <Td colSpan={6} style={{color:'#6b7280'}}>Sem dados para exibir.</Td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile list */}
              <div className="mobileList">
                {computed.byType.length === 0 ? (
                  <div style={{padding:12, color:'#6b7280'}}>Sem dados para exibir.</div>
                ) : (
                  <div style={{display:'grid', gap:8, padding:12}}>
                    {computed.byType.map((t, idx)=> (
                      <div key={idx} style={{border:'1px solid #e5e7eb', borderRadius:10, padding:12, background:'#fff'}}>
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                          <div style={{fontWeight:500}}>{t.name}</div>
                          <div style={{color:'#6b7280', fontSize:12}}>{`R$ ${t.price.toFixed(2)}`}</div>
                        </div>
                        <div style={{display:'flex', gap:10, marginTop:8, fontSize:13}}>
                          <div><span style={{color:'#6b7280'}}>Qtd:</span> {t.quantity}</div>
                          <div><span style={{color:'#6b7280'}}>Vend:</span> {t.sold}</div>
                          <div><span style={{color:'#6b7280'}}>Rest:</span> {t.remaining}</div>
                          <div style={{marginLeft:'auto'}}><span style={{color:'#6b7280'}}>Receita:</span> {`R$ ${t.revenue.toFixed(2)}`}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      <style jsx>{`
        .kpiGrid{ display:grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap:12px }
        @media(max-width: 900px){ .kpiGrid{ grid-template-columns: repeat(2, minmax(0,1fr)); } }
        .desktopTable{ display:block }
        .mobileList{ display:none }
        @media(max-width: 800px){ .desktopTable{ display:none } .mobileList{ display:block } }
      `}</style>
    </DashboardLayout>
  );
}

function Kpi({ label, value}){
  return (
    <div style={{background:'#fff', border:'1px solid #e5e7eb', borderRadius:10, padding:16}}>
      <div style={{fontSize:13, color:'#6b7280'}}>{label}</div>
      <div style={{fontSize:22, fontWeight:500, marginTop:6}}>{value}</div>
    </div>
  );
}

function Th({ children }){
  return <th style={{padding:'10px 12px', fontSize:13, color:'#6b7280', fontWeight:500}}>{children}</th>;
}

function Td({ children, ...rest }){
  return <td {...rest} style={{padding:'10px 12px'}}>{children}</td>;
}

// Helpers
function calcRange(rangeType, from, to){
  const pad = (n)=> String(n).padStart(2,'0');
  const toISO8601 = (d)=> `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  if(rangeType==='today'){
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    return { fromISO: toISO8601(start), toISO: toISO8601(now) };
  }
  if(rangeType==='7d' || rangeType==='30d'){
    const now = new Date();
    const days = rangeType==='7d' ? 7 : 30;
    const start = new Date(now.getTime() - days*24*60*60*1000);
    return { fromISO: toISO8601(start), toISO: toISO8601(now) };
  }
  if(rangeType==='custom'){
    const fromISO = from || '';
    const toISO = to || '';
    return { fromISO, toISO };
  }
  return { fromISO:'', toISO:'' };
}

function exportCsv(computed){
  const rows = [
    ['Tipo','Preco','Quantidade','Vendidos','Restantes','Receita'],
    ...computed.byType.map(t=>[
      t.name,
      (Number(t.price)||0).toFixed(2).replace('.',','),
      t.quantity,
      t.sold,
      t.remaining,
      (Number(t.revenue)||0).toFixed(2).replace('.',',')
    ])
  ];
  const csv = rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'relatorio-vendas.csv';
  a.click();
  URL.revokeObjectURL(url);
}
