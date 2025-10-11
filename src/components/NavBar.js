import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getToken, clearToken, setToken } from '../lib/auth';
import { useRouter } from 'next/router';
import api from '../lib/api';

export default function NavBar() {
  const [open, setOpen] = useState(false);
  const [logged, setLogged] = useState(null); // null = desconhecido até montar
  const router = useRouter();
  const [logoUrl, setLogoUrl] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    function updateAuthState(){
      const t = getToken();
      setLogged(!!t);
      try{
        const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
        const payload = t ? JSON.parse(atob((t.split('.')[1]||'e30='))) : null;
        setIsAdmin(!!adminEmail && payload?.email === adminEmail);
        setUserEmail(payload?.email || '');
      }catch{ setIsAdmin(false); }
    }
    updateAuthState();
    const onStorage = () => updateAuthState();
    const onFocus = () => updateAuthState();
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', onFocus);
    const onOpenAuth = (e) => {
      const detail = e?.detail || {};
      if (detail?.nextPath) setNextPath(detail.nextPath);
      setTab(detail?.tab === 'register' ? 'register' : 'login');
      setShowLogin(true);
    };
    window.addEventListener('open-auth', onOpenAuth);
    // Load logo from backend if not set via env
    if (!process.env.NEXT_PUBLIC_LOGO_URL) {
      api.get('/settings/public').then(r=>{
        if (r?.data?.logoUrl) setLogoUrl(r.data.logoUrl);
      }).catch(()=>{});
    }
    // Detect admin by token email
    return () => { window.removeEventListener('storage', onStorage); window.removeEventListener('focus', onFocus); };
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(()=>{
    if (open) { document.body.style.overflow = 'hidden'; }
    else { document.body.style.overflow = ''; }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  function logout() { clearToken(); setLogged(false); router.push('/'); }
  const isActive = (href) => router.pathname === href;
  const [showLogin, setShowLogin] = useState(false);
  const [tab, setTab] = useState('login'); // 'login' | 'register'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [loading, setLoading] = useState(false);
  const [nextPath, setNextPath] = useState('');

  async function doLogin(){
    setLoading(true);
    try{
      const r = await api.post('/auth/login', { email, password });
      setToken(r.data.token);
      setLogged(true);
      setShowLogin(false);
      setEmail(''); setPassword(''); setName(''); setWhatsapp('');
      if (nextPath) { const n = nextPath; setNextPath(''); router.push(n); } else { router.push('/me'); }
    }catch(e){
      alert(e?.response?.data?.error || 'Falha na autenticação');
    }finally{ setLoading(false); }
  }

  async function doRegister(){
    setLoading(true);
    try{
      const payload = { name, email, whatsapp };
      if (password) payload.password = password;
      const r = await api.post('/auth/register', payload);
      setToken(r.data.token);
      setLogged(true);
      setShowLogin(false);
      setEmail(''); setPassword(''); setName(''); setWhatsapp('');
      if (nextPath) { const n = nextPath; setNextPath(''); router.push(n); } else { router.push('/me'); }
    }catch(e){
      alert(e?.response?.data?.error || 'Falha no cadastro');
    }finally{ setLoading(false); }
  }
  return (
    <nav className="nav">
      <div className="wrap">
        <div className="left">
          {(process.env.NEXT_PUBLIC_LOGO_URL || logoUrl) ? (
            <Link href="/" aria-label="Ir para a Home">
              <img src={process.env.NEXT_PUBLIC_LOGO_URL || logoUrl} alt="Logo" className="logoImg"/>
            </Link>
          ) : null}
        </div>
        <div className="center">
          <form className="searchbar" onSubmit={(e)=>{ e.preventDefault(); const val = (e.currentTarget.query.value||'').trim(); router.push(val? `/?q=${encodeURIComponent(val)}` : '/'); }}>
            <span className="icon">🔍</span>
            <input name="query" placeholder="Pesquisar" defaultValue="" />
          </form>
        </div>
        <div className="right">
          <div className="menu">
            <Link href="/sobre" className={`link ${isActive('/sobre')?'active':''}`}>Sobre</Link>
            <Link href="/contato" className={`link ${isActive('/contato')?'active':''}`}>Contato</Link>
            <Link href="/fotos" className={`link ${isActive('/fotos')?'active':''}`}>Fotos</Link>
          </div>
          {/* Ações à direita: quando logado, mostrar Minha conta (email) e Sair; quando não logado, link para /login */}
          {logged === true ? (
            <div className="auth">
              <Link href="/dashboard" className="btn iconred" title="Minha conta">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8"/>
                  <path d="M12 12a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5Z" stroke="currentColor" strokeWidth="1.8"/>
                  <path d="M6.5 18.2c1.4-2.2 3.8-3.7 5.5-3.7s4.1 1.5 5.5 3.7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              </Link>
              <Link href="/dashboard" className="btn account" title={userEmail || 'Minha conta'}>
                <span className="ulabel">{userEmail || 'Minha conta'}</span>
              </Link>
              <button type="button" className="btn ghost" onClick={logout}>Sair</button>
            </div>
          ) : logged === false ? (
            <div className="auth">
              <button type="button" className="btn iconred" title="Minha conta" onClick={()=>{ setTab('login'); setShowLogin(true); }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8"/>
                  <path d="M12 12a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5Z" stroke="currentColor" strokeWidth="1.8"/>
                  <path d="M6.5 18.2c1.4-2.2 3.8-3.7 5.5-3.7s4.1 1.5 5.5 3.7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              </button>
              <button type="button" className="btn account" onClick={()=>{ setTab('login'); setShowLogin(true); }}><span className="ulabel">Minha conta</span></button>
            </div>
          ) : null}
        </div>
        <button className="hamb" aria-label="Abrir menu" onClick={()=>setOpen(o=>!o)}>
          <span/>
          <span/>
          <span/>
        </button>
      </div>

      {open && (
        <div className={`backdrop ${open?'show':''}`} onClick={()=>setOpen(false)}>
          <div className={`mobile ${open?'open':''}`} onClick={(e)=>e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Menu">
            <div className="m-top">
              <button className="m-close" aria-label="Fechar menu" onClick={()=>setOpen(false)}>✕</button>
            </div>
            <Link href="/" className="m-item" onClick={()=>setOpen(false)}>Home</Link>
            <Link href="/sobre" className="m-item" onClick={()=>setOpen(false)}>Sobre</Link>
            <Link href="/contato" className="m-item" onClick={()=>setOpen(false)}>Contato</Link>
            <Link href="/fotos" className="m-item" onClick={()=>setOpen(false)}>Fotos</Link>
            {logged===true ? (
              <a className="m-item" onClick={()=>{ setOpen(false); logout(); }}>Sair</a>
            ) : logged===false ? (
              <a className="m-item" onClick={()=>{ setOpen(false); setTab('login'); setShowLogin(true); }}>Painel</a>
            ) : null}
          </div>
        </div>
      )}

      {showLogin && (
        <div className="modal" role="dialog" aria-modal="true" onClick={()=>setShowLogin(false)}>
          <div className="modal-card" onClick={e=>e.stopPropagation()}>
            <div className="modal-title">{tab==='login' ? 'Entrar' : 'Cadastrar'}</div>
            <div className="tabs">
              <button className={`tab ${tab==='login'?'active':''}`} onClick={()=>setTab('login')}>Login</button>
              <button className={`tab ${tab==='register'?'active':''}`} onClick={()=>setTab('register')}>Cadastrar</button>
            </div>
            {tab==='register' && (
              <>
                <div className="field"><label>Nome completo</label><input value={name} onChange={e=>setName(e.target.value)} placeholder="Seu nome"/></div>
                <div className="field"><label>WhatsApp</label><input value={whatsapp} onChange={e=>setWhatsapp(e.target.value)} placeholder="(DDD) 9 9999-9999"/></div>
              </>
            )}
            <div className="field"><label>Email</label><input value={email} onChange={e=>setEmail(e.target.value)} placeholder="seu@email.com"/></div>
            {tab==='login' && (
              <div className="field"><label>Senha</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••"/></div>
            )}
            {tab==='register' && (
              <div className="field"><label>Senha (opcional)</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Deixe em branco para senha automática"/></div>
            )}
            <div className="actions">
              <button className="btn ghost" onClick={()=>setShowLogin(false)}>Cancelar</button>
              {tab==='login' ? (
                <button className="btn solid" disabled={loading} onClick={doLogin}>{loading? 'Entrando...' : 'Entrar'}</button>
              ) : (
                <button className="btn solid" disabled={loading} onClick={doRegister}>{loading? 'Cadastrando...' : 'Cadastrar'}</button>
              )}
            </div>
            <div className="hint">Clientes: use este formulário para acessar seus ingressos. Organizadores: acessem <a href="/login">/login</a> para o Dashboard.</div>
          </div>
        </div>
      )}

      <style jsx>{`
        .nav{ position:sticky; top:0; z-index:50; background:#141518; border-bottom:0 }
        .wrap{ height:64px; display:grid; grid-template-columns: auto 1fr auto; align-items:center; gap:18px; padding:0 12px; max-width:1200px; margin:0 auto }
        .logoImg{ height:42px; width:auto; display:block }
        .center{ display:flex; justify-content:center; align-items:center; position:relative; z-index:1 }
        .searchbar{ display:flex; align-items:center; gap:8px; background:#111317; border:1px solid #2f3541; border-radius:14px; padding:10px 14px; width:min(560px, 58vw); margin:0 auto; box-shadow:0 2px 10px rgba(0,0,0,.25) }
        .searchbar .icon{ color:#9ca3af }
        .searchbar input{ flex:1; background:transparent; border:0; outline:none; color:#e5e7eb; font-size:14px }
        .link{ color:#e5e7eb; text-decoration:none; padding:8px 10px; border-radius:8px; font-weight:400 !important; text-transform:uppercase !important; font-size:14px !important }
        .link:hover{ background:#2b2f3a }
        .link.active{ background:#384152 }
        .right{ display:flex; justify-content:flex-end; align-items:center; gap:22px; justify-self:end; margin-left:auto; margin-right:0; position:relative; z-index:2 }
        .menu{ display:flex; gap:22px; align-items:center }
        .auth{ display:flex; gap:8px; align-items:center }
        .user{ position:relative }
        .avatar{ width:34px; height:34px; border-radius:999px; display:inline-flex; align-items:center; justify-content:center; background:transparent; color:#e5e7eb; border:1px solid #374151; cursor:pointer }
        .dropdown{ position:absolute; top:40px; right:0; background:#111827; border:1px solid #1f2937; border-radius:8px; min-width:160px; box-shadow:0 8px 20px rgba(0,0,0,.35); padding:6px }
        .d-item{ width:100%; text-align:left; color:#e5e7eb; text-decoration:none; background:transparent; border:0; padding:8px 10px; display:block; border-radius:6px; cursor:pointer }
        .d-item:hover{ background:#1f2937 }
        .d-item.danger{ color:#fca5a5 }
        .btn{ padding:8px 12px; border-radius:8px; text-decoration:none; font-weight:600; cursor:pointer; line-height:1 }
        .btn.ghost{ color:#e5e7eb; border:1px solid #374151; background:transparent }
        .btn.solid{ background:#ef4444; color:#fff; border:0 }
        .btn.account{ background:#2a2f3a; color:#e5e7eb; border:1px solid #374151; border-radius:12px; font-weight:400 !important; padding:8px 16px; display:inline-flex; align-items:center; text-transform:uppercase !important; font-size:14px !important }
        .btn.iconred{ background:#ef4444; color:#fff; border:0; width:38px; height:38px; border-radius:999px; display:inline-flex; align-items:center; justify-content:center }
        .btn.iconred:hover{ background:#f05252 }
        .btn.account .ulabel{ line-height:1; text-transform:uppercase !important; font-size:14px !important; font-weight:400 !important }
        .hamb{ display:none; background:transparent; border:0; width:44px; height:44px; align-items:center; justify-content:center }
        .hamb span{ display:block; width:26px; height:3px; background:#e5e7eb; margin:4px 0; border-radius:2px }
        .mobile{ display:none }
        @media (max-width: 900px){
          .wrap{ grid-template-columns:auto 1fr auto }
          .left{ justify-self:start }
          .center{ display:none }
          .right{ display:none }
          .hamb{ display:flex; justify-self:end; flex-direction:column }
          .backdrop{ position:fixed; inset:0; background:rgba(0,0,0,.5); z-index:54; display:block }
          .mobile{ display:flex; flex-direction:column; padding:12px 16px; background:#0f1116; position:fixed; top:64px; left:0; right:0; bottom:0; z-index:55; border-top:0; box-shadow:0 8px 24px rgba(0,0,0,.45); overflow:auto; transform:translateY(-8px); opacity:0; transition:transform .2s ease, opacity .2s ease }
          .mobile.open{ opacity:1; transform:translateY(0) }
          .m-item{ color:#e5e7eb; text-decoration:none; padding:14px 6px; border-bottom:1px solid #1f2937; text-transform:uppercase !important; font-size:14px !important; font-weight:400 !important }
          .m-top{ display:flex; justify-content:flex-end; padding-bottom:6px; margin-bottom:6px; border-bottom:1px solid #1f2937 }
          .m-close{ background:transparent; color:#e5e7eb; border:1px solid #374151; border-radius:8px; width:36px; height:36px; display:inline-flex; align-items:center; justify-content:center; font-size:18px }
        }
        .modal{ position:fixed; inset:0; background:rgba(0,0,0,.5); display:flex; align-items:center; justify-content:center; z-index:60 }
        .modal-card{ width:100%; max-width:380px; background:#fff; border-radius:12px; border:1px solid #e5e7eb; padding:16px }
        .modal-title{ font-weight:600; margin-bottom:8px }
        .tabs{ display:flex; gap:8px; margin-bottom:8px }
        .tab{ flex:1; border:1px solid #e5e7eb; background:#f9fafb; padding:8px; border-radius:8px; cursor:pointer; font-weight:600 }
        .tab.active{ background:#fff; border-color:#93c5fd }
        .field{ margin:8px 0 }
        .field label{ display:block; font-size:12px; color:#6b7280; margin-bottom:4px }
        .field input{ width:100%; padding:10px 12px; border:1px solid #e5e7eb; border-radius:8px }
        .actions{ display:flex; justify-content:flex-end; gap:8px; margin-top:8px }
        .hint{ color:#6b7280; font-size:12px; margin-top:8px }
      `}</style>
    </nav>
  );
}
