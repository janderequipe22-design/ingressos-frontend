import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import api from '../lib/api';
import { getToken } from '../lib/auth';

// Keep react-qr-reader as a last-resort fallback
const QrReader = dynamic(() => import('react-qr-reader').then(m => m.QrReader).catch(()=>null), { ssr: false });

// Wrapper para html5-qrcode com controle de lifecycle (definido antes do componente principal)
function Html5Scanner({ onDecoded, onError }){
  const containerRef = useRef(null);
  const boxRef = useRef(null);
  const h5Ref = useRef(null);
  const [torchOn, setTorchOn] = useState(false);
  const [deviceId, setDeviceId] = useState(null);
  const [devices, setDevices] = useState([]);
  const [qrSize, setQrSize] = useState(280);
  const [overlayOpacity, setOverlayOpacity] = useState(0.18); // was 0.35, lighter for mobile
  const [isFullscreen, setIsFullscreen] = useState(false);
  const lastTextRef = useRef('');
  const lastTimeRef = useRef(0);
  const pausedRef = useRef(false);

  useEffect(()=>{
    function recomputeSize(){
      if (!boxRef.current) return;
      const host = containerRef.current || boxRef.current;
      const cw = host?.clientWidth || (typeof window!=='undefined'?window.innerWidth:360);
      const ch = host?.clientHeight || (typeof window!=='undefined'?window.innerHeight*0.6:480);
      const s = Math.floor(Math.min(cw, ch) * 0.8);
      setQrSize(Math.max(200, Math.min(s, 400)));
    }
    recomputeSize();
    const onResize = ()=>recomputeSize();
    if (typeof window!=='undefined') window.addEventListener('resize', onResize);
    return ()=>{ if (typeof window!=='undefined') window.removeEventListener('resize', onResize); };
  }, []);

  
  useEffect(()=>{
    let h5 = null;
    let stopped = false;
    async function start(){
      try{
        const mod = await import('html5-qrcode');
        const { Html5Qrcode } = mod;
        if (!boxRef.current) return;
        // disableFlip evita espelhamento em algumas câmeras
        h5 = new Html5Qrcode(boxRef.current.id, { verbose: false, disableFlip: true });
        h5Ref.current = h5;

        // discover cameras
        try {
          const cams = await Html5Qrcode.getCameras();
          setDevices(cams || []);
          // Choose back camera if available
          const back = cams?.find(c=>/back|traseira|rear|environment/i.test(c.label)) || cams?.[0];
          setDeviceId(back?.id || null);
        } catch {}

        // Use 4:3 para reduzir aliasing e distorções em muitos Androids
        const config = { fps: 15, qrbox: { width: qrSize, height: qrSize }, aspectRatio: 4/3 };
        const constraints = deviceId ? { deviceId: { exact: deviceId } } : { facingMode: 'environment' };

        await h5.start(constraints, config, (decodedText)=>{
          if (stopped) return;
          if (pausedRef.current) return;
          const now = Date.now();
          // Fire immediately, then debounce duplicate reads for 1s
          const isDuplicate = decodedText === lastTextRef.current && (now - lastTimeRef.current) < 1000;
          lastTextRef.current = decodedText;
          lastTimeRef.current = now;
          if (isDuplicate) return;
          pausedRef.current = true;
          onDecoded && onDecoded(decodedText);
          setTimeout(()=>{ pausedRef.current = false; }, 800);
        }, ()=>{});

        // Try enhance focus/zoom when supported
        try {
          const video = document.querySelector(`#${boxRef.current.id} video`);
          if (video) {
            Object.assign(video.style, { width:'100%', height:'100%', objectFit:'cover', filter:'brightness(1.18) contrast(1.06)' });
          }
          const track = video?.srcObject?.getVideoTracks?.()[0];
          const caps = track?.getCapabilities?.();
          if (caps) {
            const adv = [];
            if (caps.focusMode && caps.focusMode.includes('continuous')) adv.push({ focusMode: 'continuous' });
            if (caps.zoom) adv.push({ zoom: Math.min(caps.zoom.max || 1, (caps.zoom.min||1) + ((caps.zoom.max||1)-(caps.zoom.min||1))*0.6) });
            if (adv.length && track.applyConstraints) await track.applyConstraints({ advanced: adv });
          }
        } catch {}
      }catch(e){
        onError && onError(e?.message || String(e));
      }
    }
    // ensure container id
    if (boxRef.current && !boxRef.current.id) boxRef.current.id = `qr-region-${Math.random().toString(36).slice(2)}`;
    start();
    return ()=>{
      stopped = true;
      try { h5 && h5.stop().then(()=>h5.clear()).catch(()=>{}); } catch {}
    };
  }, [onDecoded, onError, deviceId]);

  async function toggleTorch(){
    try {
      const stream = await h5Ref.current?.getState() === 2 ? h5Ref.current.getRunningTrackCameraCapabilities() : null;
      // html5-qrcode doesn't expose torch directly, try applying constraint via track
      const video = document.querySelector(`#${boxRef.current?.id} video`);
      const track = video?.srcObject?.getVideoTracks?.()[0];
      if (track && track.applyConstraints) {
        await track.applyConstraints({ advanced: [{ torch: !torchOn }] });
        setTorchOn(v=>!v);
      }
    } catch {}
  }

  function enterFullscreen(){
    try {
      const el = document.documentElement;
      if (el.requestFullscreen) el.requestFullscreen();
      setIsFullscreen(true);
    } catch {}
  }
  function exitFullscreen(){
    try { if (document.exitFullscreen) document.exitFullscreen(); setIsFullscreen(false); } catch {}
  }
  useEffect(()=>{
    function onFs(){ setIsFullscreen(!!document.fullscreenElement); }
    if (typeof document!=='undefined') document.addEventListener('fullscreenchange', onFs);
    return ()=>{ if (typeof document!=='undefined') document.removeEventListener('fullscreenchange', onFs); };
  }, []);

  return (
    <div ref={containerRef} style={{ width:'100%', display:'flex', flexDirection:'column', alignItems:'center', position:'relative' }}>
      {/* Hide site chrome when fullscreen */}
      <style dangerouslySetInnerHTML={{__html: isFullscreen ? `.nav{display:none!important}.footer{display:none!important} body{background:#000}` : ''}} />
      <div ref={boxRef} style={{ width: '100%', maxWidth: 520, height: '60vh', background:'#000', borderRadius:12, position:'relative', overflow:'hidden' }} />
      {/* overlay dentro do mesmo container para alinhar exatamente ao preview */}
      <div aria-hidden style={{position:'absolute', top:0, left:0, right:0, height:'60vh', maxWidth:520, margin:'0 auto', pointerEvents:'none'}}>
        <div style={{position:'absolute', left:'50%', top:'30vh', transform:'translate(-50%,-50%)', width:qrSize, height:qrSize, boxShadow:`0 0 0 9999px rgba(0,0,0,${overlayOpacity})`, borderRadius:12}}>
          <div style={{position:'absolute', inset:0, border:'4px solid #fff', borderRadius:12}}/>
        </div>
      </div>
      <div style={{display:'flex', gap:8, marginTop:8, flexWrap:'wrap', alignItems:'center'}}>
        <button onClick={toggleTorch}>{torchOn? 'Lanterna: ON' : 'Lanterna: OFF'}</button>
        {!isFullscreen ? (
          <button onClick={enterFullscreen}>Tela cheia</button>
        ) : (
          <button onClick={exitFullscreen}>Sair tela cheia</button>
        )}
        {devices && devices.length>1 && (
          <select value={deviceId||''} onChange={e=>setDeviceId(e.target.value||null)}>
            {devices.map(d=>(<option key={d.id} value={d.id}>{d.label||'Câmera'}</option>))}
          </select>
        )}
        <div style={{display:'flex', gap:6, alignItems:'center'}}>
          <span style={{fontSize:12, color:'#6b7280'}}>Escurecer</span>
          <input type="range" min="0" max="0.4" step="0.02" value={overlayOpacity} onChange={e=>setOverlayOpacity(parseFloat(e.target.value)||0)} />
          <span style={{fontSize:12, color:'#6b7280'}}>Clarear</span>
        </div>
      </div>
    </div>
  );
}

function parseJwtRole(){
  try{
    const t = (typeof document!=='undefined') ? (document.cookie.match(/(?:^|; )token=([^;]+)/)?.[1] || localStorage.getItem('token')) : null;
    if (!t) return '';
    const p = JSON.parse(atob(t.split('.')[1]));
    return p?.role || '';
  }catch{ return ''; }
}

export default function Validator() {
  const [scannedText, setScannedText] = useState('');
  const [ticketId, setTicketId] = useState('');
  const [status, setStatus] = useState('idle'); // idle | valid | already_used | invalid | error
  const [message, setMessage] = useState('');
  const [camEnabled, setCamEnabled] = useState(true);
  const [camError, setCamError] = useState('');
  const [camKey, setCamKey] = useState(0); // force remount
  const locking = useRef(false);
  const lastIdRef = useRef('');
  const [logged, setLogged] = useState(false);
  const [gateId, setGateId] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const role = typeof window!=='undefined' ? parseJwtRole() : '';
  const [mounted, setMounted] = useState(false);
  const [checkerName, setCheckerName] = useState('');
  const [checkerUser, setCheckerUser] = useState('');
  const [history, setHistory] = useState([]); // últimos resultados

  useEffect(()=>{ setMounted(true); },[]);
  // Oculta header/rodapé sem <style>, para evitar hydration mismatch
  useEffect(()=>{
    if (!mounted) return;
    if (role !== 'checker') return;
    const nav = document.querySelector('.nav');
    const footer = document.querySelector('.footer');
    const prevNav = nav ? nav.style.display : '';
    const prevFooter = footer ? footer.style.display : '';
    if (nav) nav.style.display = 'none';
    if (footer) footer.style.display = 'none';
    return ()=>{
      if (nav) nav.style.display = prevNav;
      if (footer) footer.style.display = prevFooter;
    };
  }, [mounted, role]);

  // Carrega dados do checador e preenche gate, quando aplicável
  useEffect(() => {
    if (!mounted) return;
    if (role !== 'checker') return;
    (async () => {
      try{
        const r = await api.get('/checkers/me');
        setCheckerName(r.data?.fullName || '');
        setCheckerUser(r.data?.username || '');
        if (!gateId && r.data?.gate) setGateId(r.data.gate);
      }catch{}
    })();
  }, [mounted, role]);

  // If page opened with ?id=xxx, prefill and auto-validate
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    const id = url.searchParams.get('id');
    if (id) {
      setTicketId(id);
      autoValidate(id);
    }
    // restore gate/device
    try{
      const g = localStorage.getItem('validator_gateId')||''; setGateId(g);
      const d = localStorage.getItem('validator_deviceId')||''; setDeviceId(d);
    }catch{}
  }, []);

  // monitor login state
  useEffect(()=>{
    function refresh(){
      const t = getToken();
      setLogged(!!(t && t.split('.').length===3));
    }
    refresh();
    const onStorage = ()=>refresh();
    const onFocus = ()=>refresh();
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', onFocus);
    return ()=>{ window.removeEventListener('storage', onStorage); window.removeEventListener('focus', onFocus); };
  }, []);

  function extractTicketId(text) {
    if (!text) return '';
    // Direct token (JWT) or plain id
    if (/^[A-Za-z0-9_-]{16,}$/.test(text) && text.split('.').length !== 3) {
      return text; // looks like an id
    }
    // If it's a relative path like '/validator?id=...' or '?id=...'
    const maybeRel = text.trim();
    if (maybeRel.startsWith('/')) {
      try { const url = new URL(maybeRel, window?.location?.origin || 'http://localhost'); return url.searchParams.get('id') || text; } catch {}
    }
    if (maybeRel.startsWith('?')) {
      try { const url = new URL(maybeRel, window?.location?.origin || 'http://localhost'); return url.searchParams.get('id') || text; } catch {}
    }
    // If it contains id= anywhere, try regex
    const m = text.match(/[?&#]id=([a-f\d]{24})/i);
    if (m) return m[1];
    // Absolute URL
    try { const url = new URL(text); return url.searchParams.get('id') || text; } catch {}
    return text;
  }

  function beep(freq = 880, ms = 120) {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = 'sine'; o.frequency.value = freq;
      o.start(0); g.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + ms/1000);
      setTimeout(()=>{ o.stop(); ctx.close(); }, ms+40);
    } catch {}
  }

  function haptic(pattern = [50]) {
    try { if (navigator.vibrate) navigator.vibrate(pattern); } catch {}
  }

  // Heurística simples para detectar JWT
  function isLikelyJwt(text) {
    if (!text || typeof text !== 'string') return false;
    const parts = text.split('.');
    if (parts.length !== 3) return false;
    return parts[0].length > 5 && parts[1].length > 10 && parts[2].length > 10;
  }

  function setFeedback(kind) {
    setStatus(kind);
    if (kind === 'valid') { setMessage('Liberado'); beep(880, 120); haptic([60, 30, 60]); }
    else if (kind === 'already_used') { setMessage('Já utilizado'); beep(220, 200); haptic([150]); }
    else if (kind === 'invalid') { setMessage('Inválido'); beep(150, 200); haptic([200, 80, 200]); }
    else if (kind === 'error') { setMessage('Erro ao validar'); beep(120, 200); haptic([200]); }
    else { setMessage(''); }
  }

  function fmtTime(iso){
    try{ const d = new Date(iso); return d.toLocaleTimeString?.() || d.toTimeString(); }catch{ return ''; }
  }

  function composeDetails(status, details){
    const p = [];
    if (details?.gateId) p.push(`Portão: ${details.gateId}`);
    if (details?.usedAt) p.push(`Às: ${fmtTime(details.usedAt)}`);
    if (details?.checkerName || details?.checkerUsername) p.push(`Por: ${details.checkerName||''}${details.checkerUsername?` (@${details.checkerUsername})`:''}`);
    // Exibe apenas o nome do titular; não mostrar email/token
    if (details?.holderName) p.push(`Titular: ${details.holderName}`);
    const head = status==='valid' ? 'Liberado' : status==='already_used' ? 'Já utilizado' : status==='invalid' ? 'Inválido' : 'Erro ao validar';
    return p.length ? `${head} — ${p.join(' — ')}` : head;
  }

  async function validateById(id) {
    if (!id) return;
    if (!String(gateId||'').trim()) { setStatus('error'); setMessage('Informe o Portão antes de validar.'); return; }
    setFeedback('idle');
    try {
      const r = await api.post(`/validate/${id}`, { gateId: gateId||undefined, deviceId: deviceId||undefined });
      const st = r.data?.status;
      if (st === 'valid' || st === 'already_used'){
        setStatus(st);
        setMessage(composeDetails(st, r.data?.details));
        // adiciona ao histórico (máx 3)
        setHistory(prev => [{ status: st, details: r.data?.details || null, at: Date.now() }, ...prev].slice(0,3));
        if (st === 'valid') { beep(880, 120); haptic([60,30,60]); }
        else { beep(220, 200); haptic([150]); }
      } else if (st === 'invalid') {
        setFeedback('invalid');
      } else {
        setFeedback('error');
      }
    } catch (e) {
      if (e?.response?.status === 401){
        setMessage('Faça login como checador. Redirecionando...');
        try{ window.location.href = '/checador'; }catch{}
      }
      setFeedback('error');
    } finally {
      setTimeout(()=>{ locking.current = false; }, 400);
    }
  }

  async function validateToken(token) {
    if (!token) return;
    if (!String(gateId||'').trim()) { setStatus('error'); setMessage('Informe o Portão antes de validar.'); return; }
    setFeedback('idle');
    try {
      const r = await api.post(`/validate`, { token, gateId: gateId||undefined, deviceId: deviceId||undefined });
      const st = r.data?.status === 'replayed' ? 'already_used' : r.data?.status;
      if (st === 'valid' || st === 'already_used'){
        setStatus(st);
        setMessage(composeDetails(st, r.data?.details));
        // adiciona ao histórico (máx 3)
        setHistory(prev => [{ status: st, details: r.data?.details || null, at: Date.now() }, ...prev].slice(0,3));
        if (st === 'valid') { beep(880, 120); haptic([60,30,60]); }
        else { beep(220, 200); haptic([150]); }
      } else if (st === 'invalid') {
        setFeedback('invalid');
      } else {
        setFeedback('error');
      }
    } catch (e) {
      if (e?.response?.status === 401){
        setMessage('Faça login para validar.');
        try{ window.dispatchEvent(new CustomEvent('open-auth', { detail:{ tab:'login', nextPath:'/validator' } })); }catch{}
      }
      setFeedback('error');
    } finally {
      setTimeout(()=>{ locking.current = false; }, 400);
    }
  }

  function autoValidate(input) {
    if (!input) return;
    if (locking.current) return;
    if (lastIdRef.current === input) return;
    locking.current = true;
    lastIdRef.current = input;
    if (isLikelyJwt(input)) {
      validateToken(input);
    } else {
      validateById(input);
    }
  }

  const bannerStyle = {
    marginTop: 12,
    padding: 18,
    borderRadius: 12,
    fontWeight: 900,
    fontSize: 22,
    textAlign: 'center',
    color: '#fff',
    letterSpacing: .2,
  };

  const bannerColor = status === 'valid' ? '#059669' : status === 'already_used' ? '#d97706' : status === 'invalid' || status === 'error' ? '#dc2626' : '#374151';

  function statusColor(s){
    return s === 'valid' ? '#059669' : s === 'already_used' ? '#d97706' : s === 'invalid' || s === 'error' ? '#dc2626' : '#6b7280';
  }

  return (
    <div style={{padding:'8px 12px'}}>
      {/* Modo checador: UI limpa */}
      <h1>Validador de Ingressos</h1>

      {/* Login hint & Gate/Device setup */}
      <div style={{display:'flex', flexWrap:'wrap', gap:8, alignItems:'center', marginBottom:12}}>
        <span style={{fontSize:13, color: logged? '#059669' : '#dc2626', fontWeight:800}}>
          {logged ? (`Conferente autenticado${checkerName? `: ${checkerName}`:''}${checkerUser? ` (@${checkerUser})`:''}`) : 'Não autenticado'}
        </span>
        {logged && (gateId || checkerName) && (
          <span style={{marginLeft:8, fontSize:12, background:'#e5e7eb', borderRadius:999, padding:'4px 10px'}}>
            {checkerName ? `Portão: ${gateId||'-'}` : (gateId ? `Portão: ${gateId}` : '')}
          </span>
        )}
        {!logged && (
          <button onClick={()=>{ try{ window.location.href = '/checador'; }catch{} }}>
            Fazer login
          </button>
        )}
        <span style={{marginLeft:8, fontSize:12, color:'#6b7280'}}>Portão:</span>
        <input value={gateId} onChange={e=>{ setGateId(e.target.value); try{ localStorage.setItem('validator_gateId', e.target.value||''); }catch{} }} placeholder="Ex.: Principal" style={{padding:'6px 8px', border:'1px solid #e5e7eb', borderRadius:8}}/>
        <span style={{marginLeft:8, fontSize:12, color:'#6b7280'}}>Dispositivo:</span>
        <input value={deviceId} onChange={e=>{ setDeviceId(e.target.value); try{ localStorage.setItem('validator_deviceId', e.target.value||''); }catch{} }} placeholder="Ex.: Celular 01" style={{padding:'6px 8px', border:'1px solid #e5e7eb', borderRadius:8}}/>
      </div>

      <div style={{marginBottom:16}}>
        <label>
          <input type="checkbox" checked={camEnabled} onChange={e=>setCamEnabled(e.target.checked)} /> Usar câmera
        </label>
        <button style={{marginLeft:12}} onClick={()=>{ setCamError(''); setCamKey(k=>k+1); }}>Reiniciar câmera</button>
      </div>

      {camEnabled && (
        <div style={{maxWidth:520, margin:'0 auto'}}>
          {/* Proactively ask for permission and show friendly errors */}
          <PermissionProbe onError={(msg)=>setCamError(msg)} />
          {camError && (
            <div style={{margin:'8px 0', padding:10, background:'#fee2e2', color:'#991b1b', borderRadius:8}}>
              <div style={{fontWeight:800}}>Câmera bloqueada</div>
              <div style={{fontSize:13}}>{camError}</div>
              <div style={{fontSize:12, marginTop:6}}>
                Dicas: use HTTPS (túnel), verifique permissões do navegador e libere o acesso à câmera para este site.
              </div>
            </div>
          )}
          {/* Primary: html5-qrcode (melhor suporte mobile) */}
          <Html5Scanner
            key={`h5-${camKey}`}
            onDecoded={(text)=>{
              setScannedText(text);
              const idOrToken = extractTicketId(text);
              setTicketId(idOrToken);
              autoValidate(idOrToken);
            }}
            onError={(msg)=>setCamError(msg || 'Falha ao iniciar câmera (html5-qrcode).')}
          />
          {/* Fallback visual (caso html5-qrcode não renderize e usuário queira tentar outro engine) */}
          {!camError && QrReader && (
            <div style={{display:'none'}} aria-hidden>
              <QrReader constraints={{ facingMode: { ideal: 'environment' } }} onResult={()=>{}} />
            </div>
          )}
        </div>
      )}

      <div style={{marginTop:16}}>
        <div>Texto lido: {scannedText || '-'}</div>
        <div style={{display:'flex', gap:8, marginTop:8}}>
          <input placeholder="Ticket ID ou Token" value={ticketId} onChange={e=>setTicketId(e.target.value)} style={{width:320}}/>
          <button onClick={()=> autoValidate(ticketId)} disabled={!ticketId}>Validar</button>
        </div>
      </div>

      <div style={{...bannerStyle, background: bannerColor}}>
        {status === 'idle' ? 'Resultado' : message}
      </div>

      {/* Histórico das últimas 3 validações */}
      {history.length>0 && (
        <div style={{maxWidth:760, margin:'8px auto 0', background:'#fff', border:'1px solid #e5e7eb', borderRadius:12, padding:12}}>
          <div style={{fontWeight:900, marginBottom:8}}>Últimas validações</div>
          <div style={{display:'grid', gap:8}}>
            {history.map((h,i)=> (
              <div key={i} style={{display:'grid', gridTemplateColumns:'16px 1fr', gap:8, alignItems:'start'}}>
                <div style={{width:12, height:12, borderRadius:999, background: statusColor(h.status), marginTop:3}} />
                <div style={{fontSize:13, color:'#374151'}}>
                  {composeDetails(h.status, h.details)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Small helper component to proactively request camera permission and report common errors
function PermissionProbe({ onError }){
  useEffect(()=>{
    let canceled = false;
    async function probe(){
      if (!navigator?.mediaDevices?.getUserMedia){
        if (!canceled) onError && onError('Navegador não suporta getUserMedia. Tente Chrome/Firefox atualizados.');
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
        // immediately stop tracks (QrReader will open its own stream)
        stream.getTracks().forEach(t=>t.stop());
        if (!canceled) onError && onError('');
      } catch (e) {
        let msg = e?.name || 'Permissão negada ou indisponível';
        if (e?.name === 'NotAllowedError') msg = 'Permissão de câmera negada. Vá em Configurações do site e permita a câmera.';
        if (e?.name === 'NotFoundError') msg = 'Nenhuma câmera encontrada neste dispositivo.';
        if (e?.name === 'NotReadableError') msg = 'Câmera já em uso por outro app.';
        if (e?.name === 'SecurityError') msg = 'Câmera bloqueada por política. Use HTTPS.';
        if (!canceled) onError && onError(msg);
      }
    }
    probe();
    return ()=>{ canceled = true; };
  }, [onError]);
  return null;
}
