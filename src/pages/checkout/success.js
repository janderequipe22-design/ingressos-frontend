import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import api from '../../lib/api';
import { setToken, getToken } from '../../lib/auth';
import { useCart } from '../../context/CartContext';

export default function MPSuccess() {
  const router = useRouter();
  const { clear } = useCart();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [mediaInfo, setMediaInfo] = useState(null); // { eventName, ticketType, code, ticketId, qrDataUrl, holderNameDisplay, holderCpfMasked }
  const [holderName, setHolderName] = useState('');
  const [holderCpf, setHolderCpf] = useState('');
  const [binding, setBinding] = useState(false);

// === Helpers de mídia (imagem/PDF) ===
async function makeTicketImage({ eventName, ticketType, code, ticketId, qrDataUrl, holderNameDisplay, holderCpfMasked }, opts={}){
  const w = 1080, h = 1080, pad = 60;
  const canvas = document.createElement('canvas'); canvas.width=w; canvas.height=h;
  const ctx = canvas.getContext('2d');
  // fundo
  ctx.fillStyle = '#111827'; ctx.fillRect(0,0,w,h);
  // cartão
  const r = 36; const x=pad, y=pad, cw=w-pad*2, ch=h-pad*2;
  ctx.fillStyle = '#ffffff'; roundRect(ctx, x, y, cw, ch, r, true, false);
  // título
  ctx.fillStyle = '#111827'; ctx.font = '800 56px Inter, Arial';
  wrapText(ctx, eventName, x+40, y+120, cw-80, 60);
  // info
  ctx.font = '600 42px Inter, Arial'; ctx.fillText(`Tipo: ${ticketType}`, x+40, y+220);
  ctx.font = '600 38px Inter, Arial'; ctx.fillText(`Código: ${String(code||'').slice(0,16)}…`, x+40, y+280);
  if (holderNameDisplay){ ctx.font = '600 38px Inter, Arial'; ctx.fillText(`Titular: ${holderNameDisplay}`, x+40, y+340); }
  if (holderCpfMasked){ ctx.font = '600 34px Inter, Arial'; ctx.fillText(`CPF: ${holderCpfMasked}`, x+40, y+390); }
  // QR
  const qrSize = 560; const qx = x + (cw - qrSize)/2; const qy = y + 460;
  const qrImg = await loadImage(qrDataUrl || `https://chart.googleapis.com/chart?cht=qr&chs=${qrSize}x${qrSize}&chl=${encodeURIComponent(code||'')}`);
  ctx.drawImage(qrImg, qx, qy, qrSize, qrSize);
  const blob = await new Promise(res=>canvas.toBlob(res, 'image/png', 0.95));
  if (opts.returnFile){ const file = new File([blob], `ingresso-${ticketId}.png`, { type:'image/png' }); return { blob, file }; }
  return blob;
}

async function makeTicketPdf(info){
  const { blob, file } = await makeTicketImage(info, { returnFile:true });
  const pngBytes = new Uint8Array(await blob.arrayBuffer());
  const { PDFDocument } = await importPdfLib();
  const w = 1080, h = 1080;
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([w, h]);
  const pngEmbed = await pdfDoc.embedPng(pngBytes);
  page.drawImage(pngEmbed, { x:0, y:0, width:w, height:h });
  const pdfBytes = await pdfDoc.save();
  return new File([pdfBytes], `ingresso-${info.ticketId}.pdf`, { type:'application/pdf' });
}

async function importPdfLib(){
  if (typeof window === 'undefined') throw new Error('PDF only in browser');
  if (window.__PDFLIB__) return window.__PDFLIB__;
  const mod = await import('pdf-lib');
  window.__PDFLIB__ = mod; return mod;
}

function loadImage(src){
  return new Promise((resolve, reject)=>{
    const img = new Image(); img.crossOrigin='anonymous'; img.onload=()=>resolve(img); img.onerror=reject; img.src=src;
  });
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
  if (fill) ctx.fill(); if (stroke) ctx.stroke();
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = String(text||'').split(' '); let line='';
  for (let n=0; n<words.length; n++){
    const test = line + words[n] + ' ';
    if (ctx.measureText(test).width > maxWidth && n>0){ ctx.fillText(line, x, y); line = words[n] + ' '; y += lineHeight; }
    else { line = test; }
  }
  ctx.fillText(line, x, y);
}

  useEffect(() => {
    if (!router.isReady) return;
    async function run() {
      try {
        const { status } = router.query || {};
        const pending = typeof window !== 'undefined' ? localStorage.getItem('mpPending') : null;
        if (!pending) {
          // Nada pendente: envia o usuário para a conta para ver pedidos/ingressos
          setLoading(false);
          router.replace('/me');
          return;
        }
        const payload = JSON.parse(pending);
        // Guarantee purchaserEmail in payload
        let email = payload?.purchaserEmail || (typeof window!=='undefined' ? (getToken() || localStorage.getItem('lastPurchaserEmail')) : '');
        email = (email||'').trim();
        if (email) { payload.purchaserEmail = email; try{ setToken(email); }catch{} }
        // Caso queira exigir status === 'approved', descomente a checagem abaixo
        // if (status !== 'approved') { setError('Pagamento não aprovado.'); setLoading(false); return; }
        const q = payload?.purchaserEmail ? `?email=${encodeURIComponent(payload.purchaserEmail)}` : '';
        const r = await api.post(`/payments/mp/confirm${q}`, payload);
        setResult(r.data);
        clear();
        // limpa o pending após sucesso
        localStorage.removeItem('mpPending');

        // Preparar dados para compartilhar como IMAGEM/PDF (sem link)
        try {
          const order = r?.data?.order || {};
          const t = (r?.data?.tickets || [])[0]; // pega o primeiro ingresso
          if (t) {
            setMediaInfo({
              eventName: (t.eventName || order?.eventName || 'Evento').toString(),
              ticketType: (t.ticketTypeName || '-').toString(),
              code: (t.code || '').toString(),
              ticketId: t.id || t._id,
              qrDataUrl: t.qrDataUrl || '',
              holderNameDisplay: (t.holderName || '').toString(),
              holderCpfMasked: maskCpf(t.holderCpf),
            });
            setHolderName((t.holderName || '').toString());

            // Não abrir WhatsApp automaticamente (somente após salvar e o usuário acionar)
          }
        } catch {}

        // redireciona para a conta do cliente
        setTimeout(()=>{ router.push('/me'); }, 1200);
      } catch (e) {
        if (typeof window !== 'undefined') console.error('confirm error', e?.response?.data || e);
        const msg = e?.response?.data?.error || 'Falha ao confirmar pagamento';
        const det = e?.response?.data?.detail ? `: ${e.response.data.detail}` : '';
        setError(`${msg}${det}`);
      } finally {
        setLoading(false);
      }
    }
    run();
  }, [router.isReady]);

  return (
    <div className="container">
      <h1>Pagamento</h1>
      {loading && <div>Confirmando pagamento...</div>}
      {error && <div style={{color:'#f66'}}>{error}</div>}
      {result && (
        <div style={{marginTop:12, background:'#fff', border:'1px solid #e5e7eb', borderRadius:12, padding:16}}>
          <div style={{fontSize:16}}>Status do pedido: <b>{result.order?.status}</b></div>
          <div style={{color:'#6b7280', fontSize:13, marginTop:6}}>Seus ingressos ficam disponíveis no seu painel.</div>
          <div style={{marginTop:12}}>
            <a href="/me" className="btn-link" style={{display:'inline-block', background:'#111827', color:'#fff', padding:'10px 14px', borderRadius:10, textDecoration:'none', fontWeight:800}}>Ver meus ingressos</a>
          </div>
          {!!mediaInfo && (
            <div style={{marginTop:12}}>
              <div style={{fontWeight:700, marginBottom:6}}>Titular do bilhete</div>
              <div style={{display:'grid', gap:8, gridTemplateColumns:'1fr 220px auto'}}>
                <input placeholder="Nome completo" value={holderName} onChange={e=>setHolderName(e.target.value)} style={{padding:'8px 10px', border:'1px solid #e5e7eb', borderRadius:8}} />
                <input placeholder="CPF (apenas números)" value={holderCpf} onChange={e=>setHolderCpf(e.target.value.replace(/\D/g,''))} style={{padding:'8px 10px', border:'1px solid #e5e7eb', borderRadius:8}} />
                <button disabled={binding} onClick={async()=>{
                  try{
                    if (!mediaInfo?.ticketId){ alert('Sem ticket.'); return; }
                    const cpf = (holderCpf||'').replace(/\D/g,'');
                    if (!cpf || cpf.length!==11){ alert('Informe um CPF válido com 11 dígitos.'); return; }
                    setBinding(true);
                    await api.post(`/tickets/${encodeURIComponent(mediaInfo.ticketId)}/bind-public`, { cpf, name: holderName||'' });
                    setMediaInfo(v=>({ ...(v||{}), holderNameDisplay: holderName||'', holderCpfMasked: maskCpf(cpf) }));
                    alert('Dados vinculados ao bilhete.');
                  }catch(e){ alert(e?.response?.data?.error || 'Falha ao vincular'); }
                  finally{ setBinding(false); }
                }} style={{border:'1px solid #e5e7eb', background:'#fff', borderRadius:8, padding:'8px 12px', fontWeight:800}}>{binding?'Salvando...':'Salvar titular'}</button>
              </div>
              {!!mediaInfo?.holderCpfMasked && (
                <div style={{marginTop:6, fontSize:12, color:'#6b7280'}}>CPF vinculado: <b>{mediaInfo.holderCpfMasked}</b></div>
              )}
            </div>
          )}
          {!!mediaInfo && (
            <div style={{marginTop:12, display:'flex', gap:8, flexWrap:'wrap'}}>
              <button disabled={!mediaInfo?.holderCpfMasked} onClick={async()=>{
                try{
                  const { file } = await makeTicketImage(mediaInfo, { returnFile:true });
                  if (navigator.share && navigator.canShare && navigator.canShare({ files:[file] })){
                    await navigator.share({ files:[file], title:`Ingresso - ${mediaInfo.eventName}`, text:`${mediaInfo.eventName} • ${mediaInfo.ticketType}` });
                  } else {
                    const url = URL.createObjectURL(file);
                    const a = document.createElement('a'); a.href=url; a.download=`ingresso-${mediaInfo.ticketId}.png`; a.click();
                    setTimeout(()=>URL.revokeObjectURL(url), 3000);
                    alert('Imagem baixada. Envie pelo WhatsApp anexando o arquivo.');
                  }
                }catch(e){ alert('Falha ao gerar a imagem.'); }
              }} style={{border:'1px solid #e5e7eb', background:'#fff', borderRadius:10, padding:'10px 14px', fontWeight:800}}>Baixar/Compartilhar imagem</button>

              <button disabled={!mediaInfo?.holderCpfMasked} onClick={async()=>{
                try{
                  const file = await makeTicketPdf(mediaInfo);
                  if (navigator.share && navigator.canShare && navigator.canShare({ files:[file] })){
                    await navigator.share({ files:[file], title:`Ingresso - ${mediaInfo.eventName}`, text:`${mediaInfo.eventName} • ${mediaInfo.ticketType}` });
                  } else {
                    const url = URL.createObjectURL(file);
                    const a = document.createElement('a'); a.href=url; a.download=`ingresso-${mediaInfo.ticketId}.pdf`; a.click();
                    setTimeout(()=>URL.revokeObjectURL(url), 3000);
                    alert('PDF baixado. Envie pelo WhatsApp anexando o arquivo.');
                  }
                }catch(e){ alert('Falha ao gerar o PDF.'); }
              }} style={{border:'1px solid #e5e7eb', background:'#fff', borderRadius:10, padding:'10px 14px', fontWeight:800}}>Baixar/Compartilhar PDF</button>

              {/* Botão de link curto removido por solicitação */}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
