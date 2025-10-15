import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import api from '../lib/api';
import EventCard from '../components/EventCard';

export default function Home() {
  const [events, setEvents] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [slide, setSlide] = useState(0);
  const [query, setQuery] = useState('');
  const router = useRouter();

  useEffect(() => {
    api.get('/events')
      .then(r => setEvents(r.data))
      .catch(()=> setEvents([]));
  }, []);

  // Listen to URL ?q= changes coming from the navbar search and update local filter
  useEffect(() => {
    if (!router.isReady) return;
    const q = typeof router.query.q === 'string' ? router.query.q : '';
    setQuery(q);
  }, [router.isReady, router.query.q]);

  // Featured carousel: lista de eventos com featured=true (ou imageUrl)
  useEffect(()=>{
    if (!events || events.length===0) { setFeatured([]); return; }
    const list = events.filter(e=> e.featured && (e.imageUrl || e.cardImageUrl))
      .map(e=>({
        _id: e._id,
        title: e.name,
        link: `/event/${e._id}`,
        src: e.imageUrl || e.cardImageUrl,
      }));
    setFeatured(list);
    setSlide(0);
  }, [events]);

  // Auto-play
  useEffect(()=>{
    if (!featured || featured.length<=1) return;
    const iv = setInterval(()=>{ setSlide(s => (s+1) % featured.length); }, 4500);
    return ()=> clearInterval(iv);
  }, [featured]);


  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return events;
    return events.filter(e => [e.name, e.description, e.location].filter(Boolean).some(t => t.toLowerCase().includes(q)));
  }, [events, query]);

  return (
    <div>
      {/* Hero / Carousel */}
      <div className="hero-band">
        <div className="container">
          {featured.length > 0 ? (
            <div className="carousel">
              {featured.map((it, idx)=> (
                <a key={it._id} href={it.link} className={`slide ${idx===slide?'active':''}`} aria-label={it.title}>
                  <img src={it.src} alt={it.title} />
                  <div className="overlay"><div className="title">{it.title}</div></div>
                </a>
              ))}
              {featured.length>1 && (
                <div className="dots">
                  {featured.map((_,i)=>(
                    <button key={i} className={`dot ${i===slide?'on':''}`} aria-label={`Ir ao slide ${i+1}`} onClick={()=>setSlide(i)} />
                  ))}
                </div>
              )}
              {featured.length>1 && (
                <>
                  <button className="nav prev" aria-label="Anterior" onClick={()=> setSlide(s=> (s-1+featured.length)%featured.length)}>{'‹'}</button>
                  <button className="nav next" aria-label="Próximo" onClick={()=> setSlide(s=> (s+1)%featured.length)}>{'›'}</button>
                </>
              )}
            </div>
          ) : (
            <div className="hero">
              <img src={'https://picsum.photos/1200/320?1'} alt={'Banner'} />
            </div>
          )}
        </div>
      </div>

      {/* Seção clara: grade de eventos */}
      <div className="container after-hero">
        <div className="search"><h2>Eventos</h2></div>

        {/* Grid */}
        <div className="grid">
          {filtered.map(ev => <EventCard key={ev._id} ev={ev} />)}
        </div>

        
      </div>

      {/* Publicidade (abaixo dos eventos) */}
      <div className="container">
        <div className="adslot" role="complementary" aria-label="Publicidade">
          {/* Coloque aqui seu script/iframe de anúncio (Google Ads, etc.) */}
          <span>Publicidade</span>
        </div>
      </div>

      <style jsx>{`
        .container{ max-width:1100px; margin:0 auto; padding:0 16px }
        .hero-band{ background:#041218; border-bottom:0; padding:18px 0 }
        .hero{ padding:10px 0 0; margin:0 }
        .hero img{ width:100%; height:380px; object-fit:cover; border-radius:0; display:block }
        .carousel{ position:relative; height:380px; overflow:visible; border-radius:12px; }
        .slide{ position:absolute; inset:0; opacity:0; transform:scale(1.01); transition: opacity .4s ease, transform .6s ease; display:block; border-radius:12px; overflow:hidden }
        .slide.active{ opacity:1; transform:scale(1) }
        .slide img{ width:100%; height:380px; object-fit:cover; display:block; transition: transform .6s ease }
        .slide:hover img{ transform: scale(1.05) }
        .overlay{ position:absolute; left:0; right:0; bottom:0; padding:10px 12px; background:linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,.55) 60%); color:#fff }
        .overlay .title{ font-weight:800; font-size:18px; text-shadow:0 2px 8px rgba(0,0,0,.6) }
        .dots{ position:absolute; left:0; right:0; bottom:10px; display:flex; justify-content:center; gap:6px }
        .dot{ width:8px; height:8px; border-radius:999px; border:0; background:#9ca3af; opacity:.7; cursor:pointer }
        .dot.on{ background:#fff; opacity:1 }
        .nav{ position:absolute; top:50%; transform:translateY(-50%); background:#111827; color:#fff; border:1px solid rgba(255,255,255,.35); width:42px; height:42px; border-radius:999px; display:flex; align-items:center; justify-content:center; cursor:pointer; box-shadow:0 6px 20px rgba(0,0,0,.35); opacity:.95 }
        .nav.prev{ left:-18px }
        .nav.next{ right:-18px }
        .after-hero{ margin-top:-1px; padding-top:0; background:transparent }
        @media (max-width: 700px){ .hero img, .slide img, .carousel{ height:220px } .nav.prev{ left:4px } .nav.next{ right:4px } }
        .adslot{ margin:14px 0 20px; background:#f3f4f6; border:1px dashed #d1d5db; border-radius:12px; height:120px; display:flex; align-items:center; justify-content:center; color:#6b7280; font-size:14px }
        @media (min-width: 900px){ .adslot{ height:120px } }
      `}</style>
    </div>
  );
}
