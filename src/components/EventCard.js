import Link from 'next/link';

export default function EventCard({ ev }) {
  const d = new Date(ev.date);
  const day = d.getDate().toString().padStart(2, '0');
  const month = d.toLocaleString('pt-BR', { month: 'short' }).replace('.', '').toLowerCase();
  const href = `/event/${ev._id}`;

  return (
    <Link className="card card-click evcard" href={href}>
      {(ev.cardImageUrl || ev.imageUrl) && <img className="poster" src={ev.cardImageUrl || ev.imageUrl} alt={ev.name} />}
      <div className="body">
        <div className="row">
          <div className="dateBadge" aria-label={`Data ${day} de ${month}`}>
            <div className="day">{day}</div>
            <div className="month">{month}</div>
          </div>
          <div className="info">
            <h3 className="title">{(ev.name||'').toUpperCase()}</h3>
            {ev.location && <div className="city">{ev.location}</div>}
            {ev.venue && <div className="venue">{ev.venue}</div>}
          </div>
        </div>
      </div>
      <style jsx>{`
        .evcard{ display:block; background:#fff; border:1px solid #e5e7eb; border-radius:10px; overflow:hidden; text-decoration:none }
        .evcard:hover, .evcard:focus{ text-decoration:none !important; text-decoration-color:transparent !important }
        .poster{ width:100%; height:160px; object-fit:cover; display:block }
        .body{ padding:10px 12px }
        .row{ display:flex; gap:10px; align-items:flex-start }
        .dateBadge{ width:48px; min-width:48px; height:58px; border:1px solid #e5e7eb; border-radius:8px; display:flex; flex-direction:column; align-items:center; justify-content:center; background:#fff }
        .day{ font-weight:800; font-size:18px; color:#e11d48; line-height:1 }
        .month{ text-transform:uppercase; font-size:11px; color:#6b7280; margin-top:2px }
        .info{ flex:1; min-width:0 }
        .title{ margin:0 0 6px 0; font-size:15px; font-weight:800; color:#111827; text-decoration:none }
        .city{ color:#374151; font-size:13px; margin-top:2px; text-decoration:none }
        .venue{ color:#6b7280; font-size:11px; text-transform:uppercase; margin-top:2px; text-decoration:none }
        .evcard:hover, .evcard:hover .title, .evcard:hover .city, .evcard:hover .venue{ text-decoration:none !important; text-decoration-color:transparent !important; border-bottom:0 !important }
        .title, .city, .venue{ border-bottom:0 !important }
      `}</style>
    </Link>
  );
}
