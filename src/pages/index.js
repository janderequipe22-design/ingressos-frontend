import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import api from '../lib/api';
import EventCard from '../components/EventCard';

export default function Home() {
  const [events, setEvents] = useState([]);
  const [query, setQuery] = useState('');
  const router = useRouter();

  useEffect(() => { api.get('/events').then(r => setEvents(r.data)); }, []);

  // Listen to URL ?q= changes coming from the navbar search and update local filter
  useEffect(() => {
    if (!router.isReady) return;
    const q = typeof router.query.q === 'string' ? router.query.q : '';
    setQuery(q);
  }, [router.isReady, router.query.q]);

  // Hero banner: prioriza evento destacado e tenta usar imagem da galeria
  const [hero, setHero] = useState({ src: 'https://picsum.photos/1200/320?1', link: '#', title: 'Próximos eventos' });
  useEffect(()=>{
    if (!events || events.length===0) return;
    const chosen = events.find(e=>e.featured) || events.find(e=>e.imageUrl) || events[0];
    if(!chosen){ return; }
    // Se o evento tem imageUrl definida, usa ela (banner destacado manual)
    if (chosen.imageUrl){
      setHero({ src: chosen.imageUrl, link: `/event/${chosen._id}`, title: chosen.name });
      return;
    }
    // Caso contrário, tenta pegar a primeira da galeria
    api.get(`/events/${chosen._id}/gallery`).then(r=>{
      const list = r.data||[];
      if (list.length>0){
        setHero({ src: list[0].url, link: `/event/${chosen._id}`, title: chosen.name });
      } else {
        setHero({ src: 'https://picsum.photos/1200/320?1', link: '#', title: 'Próximos eventos' });
      }
    }).catch(()=>{
      setHero({ src: 'https://picsum.photos/1200/320?1', link: '#', title: 'Próximos eventos' });
    });
  }, [events]);


  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return events;
    return events.filter(e => [e.name, e.description, e.location].filter(Boolean).some(t => t.toLowerCase().includes(q)));
  }, [events, query]);

  return (
    <div>
      {/* Faixa do topo escura, full-width */}
      <div className="hero-band">
        <div className="container">
          <div className="hero">
            <a href={hero.link}>
              <img src={hero.src} alt={hero.title||'Banner'} />
            </a>
          </div>
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
        .hero-band{ background:#141518; border-bottom:0 }
        .hero{ padding:10px 0 0; margin:0 }
        .hero img{ width:100%; height:320px; object-fit:cover; border-radius:0; display:block }
        .after-hero{ margin-top:-1px; padding-top:0; background:#141518 }
        @media (max-width: 700px){ .hero img{ height:200px } }
        .adslot{ margin:14px 0 20px; background:#f3f4f6; border:1px dashed #d1d5db; border-radius:12px; height:120px; display:flex; align-items:center; justify-content:center; color:#6b7280; font-size:14px }
        @media (min-width: 900px){ .adslot{ height:120px } }
      `}</style>
    </div>
  );
}
