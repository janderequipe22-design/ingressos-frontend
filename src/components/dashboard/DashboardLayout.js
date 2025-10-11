import Link from 'next/link';
import { useRouter } from 'next/router';
import { clearToken } from '../../lib/auth';

export default function DashboardLayout({ children, title }) {
  const router = useRouter();
  const nav = [
    { href: '/dashboard/events', label: 'Eventos' },
    { href: '/dashboard/sales', label: 'Vendas' },
    { href: '/dashboard/checkers', label: 'Checadores' },
    { href: '/dashboard/settings', label: 'Configurações' },
  ];
  return (
    <div style={{display:'grid', gridTemplateColumns:'240px 1fr', minHeight:'100vh', background:'#f5f6f8'}}>
      <aside style={{background:'#111827', color:'#fff', padding:'16px 12px', display:'grid', gridTemplateRows:'auto 1fr auto', alignItems:'start'}}>
        <div style={{fontWeight:800, letterSpacing:.3, marginBottom:16}}>Painel</div>
        <nav style={{display:'grid', gap:8}}>
          {nav.map(i=>{
            const active = router.pathname.startsWith(i.href);
            return (
              <Link key={i.href} href={i.href} legacyBehavior>
                <a style={{
                  padding:'10px 12px', borderRadius:8, textDecoration:'none', color:'#e5e7eb',
                  background: active ? '#374151' : 'transparent',
                  fontWeight: active ? 700 : 500,
                }}>{i.label}</a>
              </Link>
            )
          })}
        </nav>
        <div style={{marginTop:16}}>
          <button onClick={()=>{ clearToken(); router.push('/login'); }} style={{width:'100%', textAlign:'left', padding:'10px 12px', borderRadius:8, border:'1px solid #374151', background:'#111827', color:'#e5e7eb', cursor:'pointer'}}>Sair</button>
        </div>
      </aside>
      <main style={{padding:'20px 24px'}}>
        {title && <h1 style={{margin:'0 0 16px 0', fontWeight:600, fontSize:24}}>{title}</h1>}
        <div>{children}</div>
      </main>
    </div>
  );
}
