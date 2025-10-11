import { useEffect, useMemo, useState } from 'react';
import api from '../lib/api';

export default function FotosPage(){
  const [events, setEvents] = useState([]);
  const [galleries, setGalleries] = useState({}); // eventId -> images[]
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [open, setOpen] = useState({}); // eventId -> bool
  const [onlyWithPhotos, setOnlyWithPhotos] = useState(false);
  const [visibleCount, setVisibleCount] = useState({}); // eventId -> number
  const [lightbox, setLightbox] = useState({ open:false, eventId:null, idx:0 });

  useEffect(()=>{
    let mounted = true;
    api.get('/events').then(r=>{ if(mounted) setEvents(r.data||[]); }).finally(()=>{ if(mounted) setLoading(false); });
    return ()=>{ mounted=false };
  },[]);

  const filtered = useMemo(()=>{
    const txt = q.trim().toLowerCase();
    const from = dateFrom ? new Date(dateFrom) : null;
    const to = dateTo ? new Date(dateTo) : null;
    return (events||[]).filter(ev=>{
      const tmatch = !txt || [ev.name, ev.location, ev.description].filter(Boolean).some(s=>String(s).toLowerCase().includes(txt));
      const dt = new Date(ev.date);
      const dmatch = (!from || dt >= from) && (!to || dt <= to);
      const hasPhotos = (galleries[ev._id]||[]).length > 0;
      const photosMatch = !onlyWithPhotos || hasPhotos;
      return tmatch && dmatch && photosMatch;
    });
  },[events, q, dateFrom, dateTo, onlyWithPhotos, galleries]);

  // Prefetch small previews for the first visible events to show thumbnails in the collapsed list
  useEffect(()=>{
    async function prefetchVisible(){
      const slice = filtered.slice(0, 8); // limit to avoid overfetch
      const missing = slice.filter(ev => !galleries[ev._id]);
      if (missing.length===0) return;
      try{
        const results = await Promise.all(missing.map(ev => api.get(`/events/${ev._id}/gallery`).then(r=>({ id: ev._id, list: r.data||[] })).catch(()=>({ id: ev._id, list: [] }))));
        setGalleries(g => results.reduce((acc, cur) => { acc[cur.id] = cur.list; return acc; }, { ...g }));
      }catch{}
    }
    if (filtered.length) prefetchVisible();
  }, [filtered]);

  // When switching to onlyWithPhotos, prefetch galleries for all events
  useEffect(()=>{
    async function prefetchAll(){
      const missing = events.filter(ev => !galleries[ev._id]);
      if (missing.length === 0) return;
      try{
        const results = await Promise.all(missing.map(ev => api.get(`/events/${ev._id}/gallery`).then(r=>({ id: ev._id, list: r.data||[] })).catch(()=>({ id: ev._id, list: [] }))));
        setGalleries(g => results.reduce((acc, cur) => { acc[cur.id] = cur.list; return acc; }, { ...g }));
      }catch{}
    }
    if (onlyWithPhotos && events.length){ prefetchAll(); }
  }, [onlyWithPhotos, events]);

  async function toggleOpen(ev){
    setOpen(o=>({ ...o, [ev._id]: !o[ev._id] }));
    if (!galleries[ev._id]){
      try{
        const r = await api.get(`/events/${ev._id}/gallery`);
        const list = r.data||[];
        setGalleries(g=>({ ...g, [ev._id]: list }));
        setVisibleCount(vc => ({ ...vc, [ev._id]: Math.min(12, list.length) }));
      }catch{}
    }
    if (galleries[ev._id] && !visibleCount[ev._id]){
      const len = galleries[ev._id].length;
      setVisibleCount(vc => ({ ...vc, [ev._id]: Math.min(12, len) }));
    }
  }

  return (
    <div>
      <div style={{maxWidth:1100, margin:'16px auto', padding:'0 16px'}}>
        <h1 style={{marginTop:8, fontWeight:600, fontSize:24}}>Fotos</h1>
        <div className="filters">
          <input placeholder="Buscar por evento/local" value={q} onChange={e=>setQ(e.target.value)} />
          <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} />
          <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} />
          <button onClick={()=>{ setQ(''); setDateFrom(''); setDateTo(''); }}>Limpar</button>
          <label className="check">
            <input type="checkbox" checked={onlyWithPhotos} onChange={e=>setOnlyWithPhotos(e.target.checked)} />
            <span>Somente com fotos</span>
          </label>
          <style jsx>{`
        .eventsGrid{ display:grid; gap:12px; }
        @media(min-width: 900px){ .eventsGrid{ grid-template-columns: 1fr 1fr; } }
      `}</style>
          <style jsx>{`
        .eventsGrid{ display:grid; gap:12px; }
        @media(min-width: 900px){ .eventsGrid{ grid-template-columns: 1fr 1fr; } }
        .photoGrid{ display:grid; gap:8px; grid-template-columns: 1fr; }
        @media(min-width: 700px){ .photoGrid{ grid-template-columns: 1fr 1fr; } }
        .filters{ display:grid; grid-template-columns: 2fr 1fr 1fr auto auto; gap:8px; background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:12px; margin-bottom:12px }
        .filters input{ padding:10px 12px; border:1px solid #e5e7eb; border-radius:8px }
        .filters button{ border:1px solid #e5e7eb; background:#fff; border-radius:8px; padding:10px 12px }
        .filters .check{ display:flex; align-items:center; gap:8px; color:#111827; padding:10px 8px }
        @media(max-width: 820px){ .filters{ grid-template-columns: 1fr 1fr; } .filters button{ width:100% } .filters .check{ grid-column: 1 / -1; padding:6px 0 } }
        @media(max-width: 520px){ .filters{ grid-template-columns: 1fr; } }
      `}</style>
        </div>

        {loading ? (
          <div>Carregando eventos...</div>
        ) : filtered.length === 0 ? (
          <div>Nenhum evento encontrado.</div>
        ) : (
          <div className="eventsGrid">
            {filtered.map(ev=>{
              const isOpen = !!open[ev._id];
              const imgs = galleries[ev._id] || [];
              return (
                <div key={ev._id} style={{background:'#fff', border:'1px solid #e5e7eb', borderRadius:12, overflow:'hidden'}}>
                  <div style={{display:'grid', gridTemplateColumns:'minmax(0,1fr) auto', alignItems:'center', gap:12, padding:12}}>
                    <div style={{display:'grid', gap:6}}>
                      <div style={{fontWeight:500, fontSize:17, lineHeight:1.2}}>{ev.name}</div>
                      <div style={{color:'#6b7280', fontSize:14}}>{new Date(ev.date).toLocaleString()} — {ev.location}</div>
                      {!isOpen && (
                        <div style={{display:'flex', gap:8, alignItems:'center', marginTop:4}}>
                          {(imgs.slice(0,3)).map((g)=> (
                            <div key={g._id} style={{width:64, height:48, borderRadius:8, overflow:'hidden', border:'1px solid #e5e7eb', background:'#f3f4f6'}}>
                              <img src={g.url} alt="Prévia" style={{width:'100%', height:'100%', objectFit:'cover'}}/>
                            </div>
                          ))}
                          {imgs.length>3 && (
                            <div style={{fontSize:12, color:'#6b7280'}}>+{imgs.length-3} fotos</div>
                          )}
                        </div>
                      )}
                    </div>
                    <div>
                      <button onClick={()=>toggleOpen(ev)} style={{border:'1px solid #e5e7eb', background:'#fff', borderRadius:8, padding:'6px 10px'}}>{isOpen? 'Fechar' : 'Ver fotos'}</button>
                    </div>
                  </div>
                  {isOpen && (
                    <div style={{padding:'0 12px 12px 12px'}}>
                      {imgs.length === 0 ? (
                        <div style={{color:'#6b7280'}}>Nenhuma foto enviada para este evento.</div>
                      ) : (
                        <>
                          <div className="photoGrid">
                            {(imgs.slice(0, visibleCount[ev._id] || 12)).map((g, idx) => (
                              <button key={g._id} onClick={()=>setLightbox({ open:true, eventId: ev._id, idx })} style={{display:'block', borderRadius:10, overflow:'hidden', border:'1px solid #e5e7eb', padding:0, background:'#fff', cursor:'zoom-in'}}>
                                <img src={g.url} alt="Foto do evento" style={{width:'100%', height:140, objectFit:'cover'}}/>
                              </button>
                            ))}
                          </div>
                          {(visibleCount[ev._id] || 12) < imgs.length && (
                            <div style={{display:'flex', justifyContent:'center', marginTop:10}}>
                              <button onClick={()=>setVisibleCount(v=>({ ...v, [ev._id]: Math.min((v[ev._id]||12)+12, imgs.length) }))} style={{border:'1px solid #e5e7eb', background:'#fff', borderRadius:10, padding:'10px 14px'}}>Carregar mais</button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox.open && galleries[lightbox.eventId] && (
        <div role="dialog" aria-modal="true" onClick={()=>setLightbox({ open:false, eventId:null, idx:0 })} style={{position:'fixed', inset:0, background:'rgba(0,0,0,.8)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:60}}>
          <div onClick={e=>e.stopPropagation()} style={{position:'relative', maxWidth:'90vw', maxHeight:'85vh'}}>
            <img src={galleries[lightbox.eventId][lightbox.idx]?.url} alt="" style={{maxWidth:'90vw', maxHeight:'85vh', objectFit:'contain', borderRadius:8}}/>
            <div style={{position:'absolute', top:'50%', left:-40}}>
              <button onClick={()=>setLightbox(lb=>({ ...lb, idx: Math.max(0, lb.idx-1) }))} disabled={lightbox.idx===0} style={{background:'#111827', color:'#fff', border:'1px solid #374151', borderRadius:8, padding:'6px 8px', opacity: lightbox.idx===0? .5:1}}>{'<'}</button>
            </div>
            <div style={{position:'absolute', top:'50%', right:-40}}>
              <button onClick={()=>setLightbox(lb=>({ ...lb, idx: Math.min((galleries[lb.eventId]?.length||1)-1, lb.idx+1) }))} disabled={lightbox.idx>=(galleries[lightbox.eventId].length-1)} style={{background:'#111827', color:'#fff', border:'1px solid #374151', borderRadius:8, padding:'6px 8px', opacity: lightbox.idx>=(galleries[lightbox.eventId].length-1)? .5:1}}>{'>'}</button>
            </div>
            <button onClick={()=>setLightbox({ open:false, eventId:null, idx:0 })} style={{position:'absolute', top:-40, right:0, background:'#ef4444', color:'#fff', border:'0', borderRadius:8, padding:'6px 10px'}}>Fechar</button>
          </div>
        </div>
      )}
    </div>
  );
}
