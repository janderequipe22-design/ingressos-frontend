import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';

function maskCpf(d){
  const x = String(d||'').replace(/\D/g,'');
  if (x.length !== 11) return String(d||'');
  return x.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '***.***.***-$4');
}

export default function PublicTicket(){
  const router = useRouter();
  const { id } = router.query;
  const [qrUrl, setQrUrl] = useState('');

  const name = useMemo(()=>{
    try{ return decodeURIComponent((router.query.n||'').toString()); }catch{ return (router.query.n||'').toString(); }
  }, [router.query.n]);
  const cpf = useMemo(()=>{
    try{ return decodeURIComponent((router.query.c||'').toString()); }catch{ return (router.query.c||'').toString(); }
  }, [router.query.c]);
  const sender = useMemo(()=>{
    try{ return decodeURIComponent((router.query.s||'').toString()); }catch{ return (router.query.s||'').toString(); }
  }, [router.query.s]);
  const eventName = useMemo(()=>{
    try{ return decodeURIComponent((router.query.e||'').toString()); }catch{ return (router.query.e||'').toString(); }
  }, [router.query.e]);
  const ticketType = useMemo(()=>{
    try{ return decodeURIComponent((router.query.tt||'').toString()); }catch{ return (router.query.tt||'').toString(); }
  }, [router.query.tt]);

  useEffect(()=>{
    if (!id) return;
    // QR aponta para o validador com id, gerado localmente pelo backend (/api/qr)
    try{
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const target = `${origin}/validator?id=${id}`;
      setQrUrl(`/api/qr?text=${encodeURIComponent(target)}`);
    }catch{
      // fallback mínimo caso window não esteja disponível (SSR não deve executar aqui, pois useEffect é client-side)
      setQrUrl(`/api/qr?text=${encodeURIComponent(`/validator?id=${id}`)}`);
    }
  }, [id]);

  async function saveAsImage(){
    try{
      const w = 1080, h = 1080;
      const pad = 60;
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      // fundo
      ctx.fillStyle = '#111827'; ctx.fillRect(0,0,w,h);
      // cartão
      const r = 36; const x=pad, y=pad, cw=w-pad*2, ch=h-pad*2;
      ctx.fillStyle = '#ffffff'; roundRect(ctx, x, y, cw, ch, r, true, false);
      // título
      ctx.fillStyle = '#111827'; ctx.font = '800 56px Inter, Arial';
      wrapText(ctx, eventName || 'Evento', x+40, y+120, cw-80, 60);
      // info
      ctx.font = '600 42px Inter, Arial'; if (ticketType) ctx.fillText(`Tipo: ${ticketType}`, x+40, y+220);
      ctx.font = '600 38px Inter, Arial'; ctx.fillText(`Código: ${String(id||'').slice(0,16)}…`, x+40, y+280);
      if (name){ ctx.font = '600 38px Inter, Arial'; ctx.fillText(`Titular: ${name}`, x+40, y+340); }
      if (cpf){ ctx.font = '600 34px Inter, Arial'; ctx.fillText(`CPF: ${maskCpf(cpf)}`, x+40, y+390); }
      if (sender){ ctx.font = '500 30px Inter, Arial'; ctx.fillStyle = '#374151'; ctx.fillText(`Enviado por: ${sender}`, x+40, y+430); ctx.fillStyle = '#111827'; }
      // QR
      const qrSize = 560; const qx = x + (cw - qrSize)/2; const qy = y + 460;
      const qrImg = await loadImage(qrUrl);
      ctx.drawImage(qrImg, qx, qy, qrSize, qrSize);

      const pngBlob = await new Promise(res=>canvas.toBlob(res, 'image/png', 0.95));
      const url = URL.createObjectURL(pngBlob);
      const a = document.createElement('a'); a.href=url; a.download=`bilhete-${id}.png`; a.click();
      setTimeout(()=>URL.revokeObjectURL(url), 3000);
    }catch(e){ alert('Falha ao salvar imagem do bilhete.'); }
  }

  return (
    <div style={{minHeight:'100vh', background:'#0f172a', color:'#fff', display:'grid', placeItems:'center', padding:16}}>
      <div style={{width:'100%', maxWidth:520, background:'#111827', border:'1px solid #1f2937', borderRadius:16, padding:16}}>
        <div style={{textAlign:'center', marginBottom:12}}>
          <div style={{fontWeight:800, fontSize:22}}>{eventName || 'Bilhete'}</div>
          {ticketType && <div style={{fontSize:13, color:'#9ca3af'}}>Tipo: {ticketType}</div>}
          <div style={{fontSize:12, color:'#9ca3af', marginTop:6}}>Apresente este QR no acesso</div>
        </div>

        <div style={{background:'#fff', borderRadius:12, padding:12, display:'grid', placeItems:'center'}}>
          {qrUrl && <img src={qrUrl} alt="QR do ingresso" width={320} height={320} style={{width:'100%', maxWidth:360, height:'auto'}}/>}
        </div>

        <div style={{marginTop:12, background:'#0b1220', border:'1px solid #1f2937', borderRadius:12, padding:12}}>
          {name && (<div style={{marginBottom:6}}><b>Titular:</b> {name}</div>)}
          {cpf && (<div style={{marginBottom:6}}><b>CPF:</b> {maskCpf(cpf)}</div>)}
          {sender && (<div style={{marginBottom:6, color:'#9ca3af'}}><b>Enviado por:</b> {sender}</div>)}
          {id && (<div style={{marginTop:6, fontSize:12, color:'#9ca3af'}}>Código: <code style={{color:'#cbd5e1'}}>{id}</code></div>)}
        </div>

        <div style={{marginTop:12, display:'flex', gap:8}}>
          <a href={`/validator?id=${id}`} style={{flex:1, textAlign:'center', padding:'10px 12px', background:'#059669', color:'#fff', fontWeight:800, borderRadius:10, textDecoration:'none'}}>Abrir no Validador</a>
          <button onClick={saveAsImage} style={{padding:'10px 12px', background:'#1f2937', color:'#fff', fontWeight:700, borderRadius:10, border:'1px solid #374151'}}>Salvar imagem</button>
          <button onClick={()=>window.print()} style={{padding:'10px 12px', background:'#1f2937', color:'#fff', fontWeight:700, borderRadius:10, border:'1px solid #374151'}}>Imprimir</button>
        </div>
      </div>
    </div>
  );
}

function roundRect(ctx, x, y, width, height, radius, fill, stroke) {
  const r = typeof radius === 'number' ? { tl: radius, tr: radius, br: radius, bl: radius } : radius;
  ctx.beginPath();
  ctx.moveTo(x + r.tl, y);
  ctx.lineTo(x + width - r.tr, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r.tr);
  ctx.lineTo(x + width, y + height - r.br);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r.br, y + height);
  ctx.lineTo(x + r.bl, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r.bl);
  ctx.lineTo(x, y + r.tl);
  ctx.quadraticCurveTo(x, y, x + r.tl, y);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = String(text||'').split(' ');
  let line = '';
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      ctx.fillText(line, x, y);
      line = words[n] + ' ';
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, y);
}

function loadImage(src){
  return new Promise((resolve, reject)=>{
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = ()=>resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
