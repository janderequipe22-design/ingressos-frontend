import Link from 'next/link';

export default function EventCard({ ev }) {
  const d = new Date(ev.date);
  const day = d.getDate().toString().padStart(2, '0');
  const month = d.toLocaleString('pt-BR', { month: 'short' }).replace('.', '').toLowerCase();
  const href = `/event/${ev._id}`;

  return (
    <Link className="card card-click" href={href}>
      {(ev.cardImageUrl || ev.imageUrl) && <img className="card-img" src={ev.cardImageUrl || ev.imageUrl} alt={ev.name} />}
      <div className="card-body">
        <div className="ev-row">
          <div className="ev-date">
            <div className="ev-day">{day}</div>
            <div className="ev-month">{month}</div>
          </div>

          <div className="ev-info">
            <h3 className="ev-title">{(ev.name||'').toUpperCase()}</h3>
            {ev.location && <div className="ev-city">{ev.location}</div>}
            {ev.venue && <div className="ev-venue">{ev.venue}</div>}
          </div>
        </div>
      </div>
    </Link>
  );
}
