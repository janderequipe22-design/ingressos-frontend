import Link from 'next/link';

export default function Footer() {
  const year = new Date().getFullYear();
  const company = process.env.NEXT_PUBLIC_COMPANY_NAME || 'Sua Empresa';
  const address = process.env.NEXT_PUBLIC_COMPANY_ADDRESS || 'Rua Exemplo, 123 - Centro, Cidade - UF, CEP 00000-000';
  const phone = process.env.NEXT_PUBLIC_COMPANY_PHONE || '(11) 99999-9999';
  const email = process.env.NEXT_PUBLIC_COMPANY_EMAIL || 'contato@suaempresa.com.br';

  return (
    <footer className="site-footer">
      <div className="container">
        <div className="foot-grid">
          <div className="col">
            <h4 className="ft-title">{company}</h4>
            <p className="ft-item">{address}</p>
            <p className="ft-item"><a href={`tel:${phone.replace(/[^+\d]/g,'')}`}>{phone}</a></p>
            <p className="ft-item"><a href={`mailto:${email}`}>{email}</a></p>
          </div>
          <div className="col">
            <h4 className="ft-title">Legal</h4>
            <ul className="ft-links">
              <li><Link href="/termos">Termos de Uso</Link></li>
              <li><Link href="/privacidade">Política de Privacidade</Link></li>
            </ul>
          </div>
        </div>
        <div className="trust">
          <span className="lock" aria-hidden>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7 10V8a5 5 0 1110 0v2" stroke="#16a34a" strokeWidth="2" strokeLinecap="round"/>
              <rect x="5" y="10" width="14" height="10" rx="2" stroke="#16a34a" strokeWidth="2"/>
              <circle cx="12" cy="15" r="1.75" fill="#16a34a"/>
            </svg>
          </span>
          <span className="trust-text">Compra 100% segura • Ambiente criptografado SSL</span>
        </div>
        <div className="copy">
          <span>© {year} {company}. Todos os direitos reservados.</span>
        </div>
      </div>
      <style jsx>{`
        .site-footer{ background:#f7f7f8; border-top:1px solid #e5e7eb; margin-top:24px }
        .foot-grid{ display:grid; grid-template-columns: 1fr; gap:16px; padding:16px 0 }
        .col{ color:#374151 }
        .ft-title{ margin:0 0 8px 0; font-weight:800; color:#111827 }
        .ft-item{ margin:4px 0 }
        .ft-item a{ color:#374151; text-decoration:none }
        .ft-item a:hover{ text-decoration:underline }
        .ft-links{ list-style:none; padding:0; margin:0; display:grid; gap:6px }
        .trust{ display:flex; align-items:center; gap:8px; border-top:1px solid #e5e7eb; padding:12px 0; color:#16a34a; font-weight:600; justify-content:center }
        .trust .lock{ display:inline-flex; align-items:center; justify-content:center }
        .trust-text{ color:#166534 }
        .copy{ border-top:1px solid #e5e7eb; padding:12px 0; color:#6b7280; font-size:12px; display:flex; justify-content:center }
        @media (min-width: 900px){
          .foot-grid{ grid-template-columns: 2fr 1fr }
        }
      `}</style>
    </footer>
  );
}
