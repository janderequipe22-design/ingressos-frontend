import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import api from '../lib/api';
import { getToken, setToken, clearToken } from '../lib/auth';

export default function Scanner(){
  const router = useRouter();
  const divRef = useRef(null);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const html5qrcodeRef = useRef(null);
  const [token, setTok] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(()=>{ setTok(getToken()); }, []);

  async function doLogin(){
    setAuthLoading(true); setAuthError('');
    try{
      const r = await api.post('/auth/login', { email, password });
      if (r?.data?.token){ setToken(r.data.token); setTok(r.data.token); }
      else { setAuthError('Falha no login'); }
    }catch(e){ setAuthError(e?.response?.data?.error || 'Falha no login'); }
    finally{ setAuthLoading(false); }
  }

  function doLogout(){ clearToken(); setTok(''); }

  useEffect(()=>{
    let disposed = false;
    async function start(){
      setError('');
      try{
        const { Html5QrcodeScanner } = await import('html5-qrcode');
        if (disposed) return;
        const scanner = new Html5QrcodeScanner(divRef.current.id, { fps: 10, qrbox: { width: 250, height: 250 } }, false);
        html5qrcodeRef.current = scanner;
        scanner.render((decodedText)=>{
          if (!decodedText) return;
          try{
            // If the QR contains a full validator URL, route there directly
            const m = decodedText.match(/\/validator\?id=([^&\s]+)/i);
            if (m && m[1]){
              router.push(`/validator?id=${encodeURIComponent(m[1])}`);
              return;
            }
            // If contains a ticket id alone
            if (/^\d+$/.test(decodedText)){
              router.push(`/validator?id=${decodedText}`);
              return;
            }
            // Otherwise, try to parse URL and extract id param
            try{
              const u = new URL(decodedText);
              const id = u.searchParams.get('id');
              if (id) { router.push(`/validator?id=${encodeURIComponent(id)}`); return; }
              // Fallback: just navigate to the decoded URL
              window.location.href = decodedText;
            }catch{
              alert(`QR lido: ${decodedText}`);
            }
          }catch(e){ setError('Falha ao processar QR'); }
        }, (err)=>{ /* ignore scan errors */ });
        setReady(true);
      }catch(e){ setError('Falha ao iniciar camera/QR. Permita acesso a camera.'); }
    }
    start();
    return ()=>{
      disposed = true;
      try{ html5qrcodeRef.current?.clear(); }catch{}
    };
  }, [router]);

  return (
    <div style={{minHeight:'100vh', background:'#0f172a', color:'#e5e7eb', display:'grid', placeItems:'center', padding:16}}>
      <div style={{width:'min(520px, 94vw)'}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <h1 style={{margin:'0 0 10px 0'}}>Leitor de QR Code</h1>
          {token && <button onClick={doLogout} style={{background:'transparent', color:'#9ca3af', border:'1px solid #374151', padding:'6px 10px', borderRadius:8}}>Sair</button>}
        </div>
        <div id="qr-reader" ref={divRef} style={{width:'100%', background:'#111827', border:'1px solid #1f2937', borderRadius:10, padding:10}} />
        {!ready && !error && <div style={{marginTop:8}}>Inicializando câmera...</div>}
        {error && <div style={{marginTop:8, color:'#fca5a5'}}>{error}</div>}
        <div style={{marginTop:12, fontSize:12, color:'#9ca3af'}}>Dica: aponte para o QR do ingresso (ou a URL do validador). Ao ler, você será levado à tela de validação.</div>
      </div>
    </div>
  );
}
