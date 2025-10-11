import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import api from '../../lib/api';
import { useCart } from '../../context/CartContext';
import Link from 'next/link';
import { getToken } from '../../lib/auth';

export default function EventPage() {
  const router = useRouter();
  const { id } = router.query;
  const [ev, setEv] = useState(null);
  const [qtyByType, setQtyByType] = useState({});
  const { addItem } = useCart();

  useEffect(() => {
    if (!id) return;
    api.get(`/events/${id}`).then(r => setEv(r.data));
  }, [id]);

  // Hooks must run unconditionally; compute date parts safely even when ev is null
  const d = useMemo(()=> (ev && ev.date) ? new Date(ev.date) : null, [ev?.date]);
  const day = useMemo(()=> d ? d.getDate().toString().padStart(2,'0') : '', [d]);
  const month = useMemo(()=> d ? d.toLocaleString('pt-BR', { month:'short' }).toUpperCase() : '', [d]);
  const weekDay = useMemo(()=> d ? d.toLocaleString('pt-BR', { weekday:'short' }).toUpperCase() : '', [d]);
  const timeStr = useMemo(()=> d ? d.toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' }) : '', [d]);

  if (!ev) return <div className="container">Carregando...</div>;

  const feeRate = 0.10; // 10% taxa de serviço
  const selected = ev.ticketTypes.map(t => ({ ...t, q: qtyByType[t.name]||0 })).filter(t => t.q>0);
  const totals = selected.reduce((acc, t) => {
    const sub = t.q * t.price;
    const fee = sub * feeRate;
    return { price: acc.price + sub, fee: acc.fee + fee };
  }, { price:0, fee:0 });
  const total = totals.price + totals.fee;

  return (
    <div className="event-page">
      <div className="container">
        {/* Top two-column: poster left, info right */}
        <div className="event-top">
          <div className="event-left">
            {ev.imageUrl && (
              <img className="event-poster" src={ev.imageUrl} alt={ev.name} />
            )}
          </div>
          <div className="event-right">
            <div className="event-right-top">
              <div className="event-header">
                <div className="event-date">
                  <div className="day">{day}</div>
                  <div className="month">{month}</div>
                  <div className="week">{weekDay}</div>
                </div>
                <div className="event-meta">
                  <h1 className="event-title" style={{textTransform:'uppercase'}}>{ev.name}</h1>
                  <div className="event-info">
                    <span>{timeStr}</span>
                    <span>•</span>
                    <span>{ev.location}</span>
                  </div>
                </div>
              </div>
              <Countdown targetDate={d} />
            </div>
            <div className="sector-bar"><span className="sector-chip">PISTA</span></div>

            {/* Ticket list (now on the right side) */}
            <div className="ticket-section">
              <div className="ticket-head">
                <div>INGRESSO</div>
                <div style={{textAlign:'center'}}>QUANTIDADE</div>
                <div style={{textAlign:'right'}}>VALOR</div>
                <div style={{textAlign:'right'}}>TAXA</div>
                <div style={{textAlign:'right'}}>SUBTOTAL</div>
              </div>
              <div className="ticket-table">
                {ev.ticketTypes.map(t => {
                  const remaining = (t.quantity||0) - (t.sold||0);
                  const q = qtyByType[t.name]||0;
                  const sub = q * t.price;
                  const fee = sub * feeRate;
                  return (
                    <div key={t.name}>
                      <div className="ticket-row">
                        <div>
                          <div className="lot-label">1º LOTE PROMOCIONAL</div>
                          <div className="ticket-name">{t.name}</div>
                          <div className="ticket-note">Disponíveis: {remaining}</div>
                        </div>
                        <div className="qty">
                          <button aria-label={`Diminuir ${t.name}`} onClick={()=>{
                            const next = Math.max(0, q-1);
                            setQtyByType({...qtyByType, [t.name]: next});
                          }}>
                            −
                          </button>
                          <div className="val">{q}</div>
                          <button aria-label={`Aumentar ${t.name}`} onClick={()=>{
                            const next = Math.min(remaining, q+1);
                            setQtyByType({...qtyByType, [t.name]: next});
                          }}>
                            +
                          </button>
                        </div>
                        <div className="ticket-price">R$ {t.price.toFixed(2)}</div>
                        <div className="ticket-fee">R$ {fee.toFixed(2)}</div>
                        <div className="ticket-sub">R$ {sub.toFixed(2)}</div>
                      </div>
                      <div className="ticket-disclaimer">É permitida a entrada de menores, acima de 16 anos, somente acompanhados dos pais. Apresentar documento oficial com foto na portaria.</div>
                    </div>
                  );
                })}
              </div>

              <div className="total-bar">
                <div>
                  <strong>TOTAL</strong> R$ {total.toFixed(2)}
                  <div style={{fontSize:12, color:'#6b7280'}}>Inclui taxa de serviço R$ {totals.fee.toFixed(2)}</div>
                </div>
                <button className="buy-btn" disabled={total<=0} onClick={()=>{
                  ev.ticketTypes.forEach(t => {
                    const q = qtyByType[t.name]||0;
                    if (q>0) addItem({eventId: ev._id, eventName: ev.name, ticketTypeName: t.name, unitPrice: t.price, quantity: q });
                  });
                  const token = getToken();
                  if (!token) {
                    if (typeof window !== 'undefined') {
                      window.dispatchEvent(new CustomEvent('open-auth', { detail: { nextPath: '/checkout', tab: 'register' } }));
                    }
                  } else {
                    router.push('/checkout');
                  }
                }}>Comprar ingressos</button>
              </div>
            </div>
          </div>
        </div>
        {/* Info section */}
        <div className="info-section">
          <h3>Informações</h3>
          {ev.description ? (
            <div style={{whiteSpace:'pre-wrap'}}>{ev.description}</div>
          ) : (
            <ul className="info-list">
              <li>Local: {ev.location}</li>
              <li>Data: {d.toLocaleDateString('pt-BR')} às {timeStr}</li>
            </ul>
          )}
        </div>
        <style jsx>{`
          .event-top{ display:grid; grid-template-columns: 360px 1fr; gap:16px; align-items:start }
          .event-poster{ width:100%; height:100%; max-height:420px; object-fit:cover; border-radius:12px; display:block }
          .event-right{ display:grid; gap:12px }
          .event-header{ display:flex; gap:12px; align-items:center }
          .event-date{ width:68px; height:86px; display:grid; place-items:center; border:1px solid #e5e7eb; border-radius:12px; background:#fff; text-align:center }
          .event-date .day{ font-size:24px; font-weight:700 }
          .event-date .month, .event-date .week{ font-size:12px; color:#6b7280 }
          .event-title{ margin:0 }
          .event-info{ color:#6b7280; display:flex; gap:8px }
          .sector-bar{ background:#f3f4f6; border:1px solid #e5e7eb; border-radius:12px; padding:6px; display:flex; justify-content:center }
          .sector-chip{ background:#111827; color:#fff; border-radius:8px; padding:6px 12px; font-weight:600 }
          .ticket-section{ background:#fff; border:1px solid #e5e7eb; border-radius:12px; overflow:hidden }
          .ticket-head{ display:grid; grid-template-columns: 1.5fr .9fr .7fr .7fr .9fr; gap:8px; padding:10px 12px; background:#f9fafb; color:#6b7280; font-weight:500 }
          .ticket-table{ padding:0 12px 12px }
          .ticket-row{ display:grid; grid-template-columns: 1.5fr .9fr .7fr .7fr .9fr; gap:8px; align-items:center; padding-top:10px }
          .lot-label{ color:#b91c1c; font-weight:700; font-size:12px }
          .ticket-name{ font-weight:600 }
          .ticket-note{ color:#6b7280; font-size:12px }
          .qty{ display:flex; align-items:center; gap:8px; justify-content:center }
          .qty button{ width:36px; height:36px; border-radius:8px; border:1px solid #e5e7eb; background:#fff; font-size:18px; line-height:1; cursor:pointer }
          .qty .val{ min-width:22px; text-align:center }
          .ticket-price, .ticket-fee, .ticket-sub{ text-align:right }
          .ticket-sub{ font-weight:600 }
          .total-bar{ margin-top:10px; border-top:1px solid #e5e7eb; padding:12px; display:flex; align-items:center; justify-content:space-between }
          .buy-btn{ background:#111827; color:#fff; border:0; border-radius:10px; padding:10px 14px; font-weight:600 }
          .info-section{ margin-top:16px }

          /* Mobile adjustments */
          @media(max-width: 900px){
            .event-top{ grid-template-columns: 1fr }
            .event-poster{ max-height:260px }
          }
          @media(max-width: 700px){
            .ticket-head{ display:none }
            .ticket-table{ padding:0 8px 12px }
            .ticket-row{ grid-template-columns: 1fr 1fr; grid-template-areas: 'name name' 'qty qty' 'price fee' 'sub sub'; gap:10px; padding:12px 0; border-bottom:1px solid #f1f5f9 }
            .ticket-row > div:first-child{ grid-area: name }
            .ticket-row .qty{ grid-area: qty }
            .ticket-row .ticket-price{ grid-area: price; text-align:left }
            .ticket-row .ticket-fee{ grid-area: fee; text-align:right }
            .ticket-row .ticket-sub{ grid-area: sub; text-align:right }
            .qty button{ width:40px; height:40px; font-size:20px }
          }
        `}</style>
      </div>
    </div>
  );
}

function Countdown({ targetDate }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!targetDate) return null;
  const diff = Math.max(0, targetDate.getTime() - now);
  const mins = Math.floor(diff / 60000);
  const days = Math.floor(mins / (60*24));
  const hours = Math.floor((mins % (60*24)) / 60);
  const minutes = mins % 60;
  return (
    <div className="countdown">
      <div style={{fontWeight:700}}>Término das vendas online</div>
      <div className="nums">
        <span><div>{days}</div><div className="label">DIAS</div></span>
        <span><div>{hours}</div><div className="label">HORAS</div></span>
        <span><div>{minutes}</div><div className="label">MIN</div></span>
      </div>
    </div>
  );
}
