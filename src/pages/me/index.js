import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import api from '../../lib/api';
import { getToken, clearToken, setToken } from '../../lib/auth';

export default function MyAccount(){
  const [logged, setLogged] = useState(null); // null until mounted
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [emailUsed, setEmailUsed] = useState('');
  const [showRaw, setShowRaw] = useState(false);
  const [detailsMap, setDetailsMap] = useState({}); // { [ticketId]: details from GET /tickets/:id }
  function pickEmail(){
    const fromLS = (typeof window!=='undefined' ? localStorage.getItem('lastPurchaserEmail') : '') || '';
    const fromToken = getToken() || '';
    if ((fromLS||'').includes('@')) return fromLS.trim();
    if ((fromToken||'').includes('@')) return fromToken.trim();
    return '';
  }

  async function copyInviteLink({ ticketId }){
    try{
      // Busca detalhes para obter invite.token
      const r = await api.get(`/tickets/${encodeURIComponent(ticketId)}`);
      const inv = r?.data?.invite;
      if (!inv || inv.status !== 'pending' || !inv.token){
        alert('Este ingresso não possui um convite pendente. Gere um novo em "Convidar".');
        return;
      }
      const origin = (typeof window!== 'undefined') ? window.location.origin : '';
      const url = `${origin}/invite/${inv.token}`;
      try { await navigator.clipboard.writeText(url); alert('Link de convite copiado.'); }
      catch { alert(url); }
    }catch(e){
      alert(e?.response?.data?.error || 'Falha ao obter link do convite');
    }
  }

  async function copyQrToken({ ticketId }){
    const token = qrMap[ticketId]?.token;
    if (!token){
      alert('Ative o QR dinâmico primeiro.');
      return;
    }
    try { await navigator.clipboard.writeText(token); alert('Token do QR copiado.'); }
    catch { alert(token); }
  }

  // QR dinâmico: estado e helpers
  const [qrMap, setQrMap] = useState({}); // { [ticketId]: { token, timerId } }

  async function refreshQrToken(ticketId) {
    try {
      const r = await api.post(`/tickets/${encodeURIComponent(ticketId)}/qr-refresh`);
      const token = r?.data?.token;
      if (!token) return;
      setQrMap(prev => ({ ...prev, [ticketId]: { ...(prev[ticketId]||{}), token } }));
    } catch {}
  }

  function startQrRotation(ticketId) {
    if (qrMap[ticketId]?.timerId) return; // evita duplicar timers
    refreshQrToken(ticketId); // atualiza agora
    const id = setInterval(() => refreshQrToken(ticketId), 15000); // ~15s
    setQrMap(prev => ({ ...prev, [ticketId]: { ...(prev[ticketId]||{}), timerId: id } }));
  }

  useEffect(() => {
    return () => {
      Object.values(qrMap).forEach(x => { if (x?.timerId) clearInterval(x.timerId); });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Vincular CPF ao bilhete (uma única vez)
  async function bindCpfUi({ ticketId }){
    try{
      const name = prompt('Nome completo do titular (opcional):') || '';
      let cpf = prompt('Informe o CPF (apenas números):') || '';
      cpf = (cpf||'').replace(/\D/g,'');
      if (!cpf){ alert('CPF não informado.'); return; }
      const r = await api.post(`/tickets/${encodeURIComponent(ticketId)}/bind-public`, { cpf, name });
      if (r?.data?.ok){
        alert('CPF vinculado ao ingresso.');
        // atualizar detalhes locais
        try{
          const d = (await api.get(`/tickets/${encodeURIComponent(ticketId)}`)).data;
          setDetailsMap(prev=> ({ ...prev, [ticketId]: d }));
        }catch{}
      }
    }catch(e){ alert(e?.response?.data?.error || 'Falha ao vincular CPF'); }
  }

  async function clearDev(){
    try{
      const email = pickEmail();
      if (!email){ alert('Informe um email acima e clique em Buscar antes.'); return; }
      if (!confirm(`Apagar pedidos/ingressos do email ${email}? (somente DEV)`)) return;
      await api.delete(`/payments/mp/dev/clear?email=${encodeURIComponent(email)}`);
      // refetch
      setLoading(true);
      const q = `?email=${encodeURIComponent(email)}`;
      const r = await api.get(`/payments/mp/orders/mine${q}`);
      setData(r.data||[]);
    }catch(e){ alert('Falha ao limpar (dev)'); }
    finally{ setLoading(false); }
  }

  useEffect(()=>{ setLogged(!!getToken()); },[]);
  useEffect(()=>{
    if(logged!==true){ if(logged===false) setLoading(false); return; }
    const email = pickEmail();
    const q = email ? `?email=${encodeURIComponent(email)}` : '';
    setEmailUsed(email);
    api.get(`/payments/mp/orders/mine${q}`)
      .then(async (r)=>{
        const rows = r.data||[];
        setData(rows);
        // Auto-fetch ticket details (holder/invite/status) for disabling/enabling actions
        try{
          const ids = [];
          rows.forEach(row=> (row.tickets||[]).forEach(t=>ids.push(t._id)));
          // sequential to avoid flooding
          for (const id of ids){
            try{
              const d = (await api.get(`/tickets/${encodeURIComponent(id)}`)).data;
              setDetailsMap(prev=> ({ ...prev, [id]: d }));
            }catch{}
          }
        }catch{}
      })
      .catch(e=>{
        if (e?.response?.status === 401) setLogged(false);
      })
      .finally(()=>setLoading(false));
  },[logged]);

  if(logged===null){
    return <div style={{minHeight:'50vh', display:'grid', placeItems:'center'}}>Carregando...</div>;
  }

// Share helpers
async function shareTicketSmart({ eventName, ticketType, code, ticketId, qrDataUrl }){
  try{
    // 1) Gera PNG do ingresso
    const { blob, file } = await shareTicketAsImage({ eventName, ticketType, code, ticketId, qrDataUrl, returnFile:true });
    // 2) Mobile (Web Share API com arquivo)
    if (navigator.share && navigator.canShare && navigator.canShare({ files:[file] })){
      await navigator.share({ files:[file], title:`Ingresso - ${eventName}`, text:`${eventName} • ${ticketType}` });
      return;
    }
    // 3) Desktop: força download da imagem
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `ingresso-${ticketId}.png`; a.click();
    setTimeout(()=>URL.revokeObjectURL(url), 3000);
  }catch(e){
    console.error(e);
    alert('Não foi possível compartilhar o ingresso agora.');
  }
}

async function shareTicketAsImage({ eventName, ticketType, code, ticketId, qrDataUrl, holderNameDisplay, holderCpfMasked, senderEmail, returnFile=false }){
  const w = 1080, h = 1080; // quadrado para melhor compatibilidade de compartilhamento
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
  wrapText(ctx, eventName, x+40, y+120, cw-80, 60);
  // info
  ctx.font = '600 42px Inter, Arial'; ctx.fillText(`Tipo: ${ticketType}`, x+40, y+220);
  ctx.font = '600 38px Inter, Arial'; ctx.fillText(`Código: ${code.slice(0,16)}…`, x+40, y+280);
  // titular
  if (holderNameDisplay){ ctx.font = '600 38px Inter, Arial'; ctx.fillText(`Titular: ${holderNameDisplay}`, x+40, y+340); }
  if (holderCpfMasked){ ctx.font = '600 34px Inter, Arial'; ctx.fillText(`CPF: ${holderCpfMasked}`, x+40, y+390); }
  if (senderEmail){ ctx.font = '500 30px Inter, Arial'; ctx.fillStyle = '#374151'; ctx.fillText(`Enviado por: ${senderEmail}`, x+40, y+430); ctx.fillStyle = '#111827'; }
  // QR
  const qrSize = 560; const qx = x + (cw - qrSize)/2; const qy = y + 460;
  const qrImg = await loadImage(qrDataUrl || `https://chart.googleapis.com/chart?cht=qr&chs=${qrSize}x${qrSize}&chl=${encodeURIComponent(code)}`);
  ctx.drawImage(qrImg, qx, qy, qrSize, qrSize);

  const pngBlob = await new Promise(res=>canvas.toBlob(res, 'image/png', 0.95));
  if (returnFile){
    const file = new File([pngBlob], `ingresso-${ticketId}.png`, { type:'image/png' });
    return { blob: pngBlob, file };
  }
  // default: baixar
  const url = URL.createObjectURL(pngBlob);
  const a = document.createElement('a'); a.href=url; a.download=`ingresso-${ticketId}.png`; a.click();
  setTimeout(()=>URL.revokeObjectURL(url), 3000);
}

  if(!logged){
    return (
      <div style={{minHeight:'50vh', padding:16}}>
        <div style={{display:'flex', justifyContent:'flex-end', marginBottom:12}}>
          <button onClick={()=>{
            try{ window.dispatchEvent(new CustomEvent('open-auth', { detail:{ tab:'login', nextPath:'/me' } })); }catch{}
          }} style={{background:'#ef4444', color:'#fff', border:0, borderRadius:8, padding:'8px 12px', fontWeight:700}}>Login</button>
        </div>
        <div style={{background:'#fff', border:'1px solid #e5e7eb', borderRadius:12, padding:16, maxWidth:560, width:'100%', margin:'0 auto'}}>
          <h1 style={{marginTop:0}}>Minha Conta</h1>
          <div>Você não está logado. Clique em "Login" no canto superior direito para entrar e ver seus pedidos e ingressos.</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{padding:16}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12}}>
        <h1 style={{margin:0}}>Minha Conta</h1>
      </div>

      <div style={{marginBottom:12, background:'#fff', border:'1px solid #e5e7eb', borderRadius:12, padding:12}}>
        <div style={{fontSize:12, color:'#6b7280'}}>Buscando pedidos para o email:</div>
        <div style={{fontWeight:700}}>{emailUsed || '(não definido)'}</div>
        <div style={{display:'flex', gap:8, marginTop:8}}>
          <input id="emailManual" placeholder="Informe seu email e clique em Buscar" style={{flex:1, padding:'8px 10px', border:'1px solid #e5e7eb', borderRadius:8}} />
          <button onClick={()=>{
            const el = document.getElementById('emailManual');
            const v = (el?.value||'').trim();
            if (!v) return;
            try{ setToken(v); localStorage.setItem('lastPurchaserEmail', v); }catch{}
            setLogged(true); setLoading(true);
          }} style={{border:'1px solid #e5e7eb', background:'#fff', borderRadius:8, padding:'8px 12px', fontWeight:700}}>Buscar</button>
          <button onClick={clearDev} style={{border:'1px solid #ef4444', color:'#ef4444', background:'#fff', borderRadius:8, padding:'8px 12px', fontWeight:700}}>Limpar (dev)</button>
          <button onClick={()=>setShowRaw(s=>!s)} style={{border:'1px solid #e5e7eb', background:'#fff', borderRadius:8, padding:'8px 12px', fontWeight:700}}>Ver JSON</button>
        </div>
      </div>

      {loading ? (
        <div>Carregando...</div>
      ) : data.length === 0 ? (
        <div>
          Nenhum pedido encontrado.
          {showRaw && (
            <pre style={{whiteSpace:'pre-wrap', background:'#f9fafb', border:'1px solid #e5e7eb', borderRadius:8, padding:12, marginTop:8}}>{JSON.stringify({ emailUsed, data }, null, 2)}</pre>
          )}
        </div>
      ) : (
        <div style={{display:'grid', gap:12}}>
          {data.map((row, idx)=> (
            <div key={idx} style={{background:'#fff', border:'1px solid #e5e7eb', borderRadius:12, padding:16}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <div>
                  <div style={{fontWeight:800}}>Pedido #{String(row.order._id).slice(-6)}</div>
                  <div style={{color:'#6b7280', fontSize:12}}>{new Date(row.order.createdAt).toISOString().replace('T',' ').slice(0,16)} — Status: <b>{row.order.status}</b></div>
                </div>
                <div style={{fontWeight:800}}>Total: R$ {Number(row.order.totalAmount||0).toFixed(2)}</div>
              </div>

              {row.tickets && row.tickets.length>0 && (
                <div style={{marginTop:12}}>
                  <div style={{fontWeight:700, marginBottom:6}}>Ingressos</div>
                  <div style={{display:'grid', gap:12}}>
                    {row.tickets.map(t => {
                      const d = detailsMap[t._id] || {};
                      const inviteStatus = d?.invite?.status || 'none';
                      const holderEmail = (d?.holderEmail || '').toString();
                      const holderName = (d?.holderName || '').toString();
                      const purchaserEmail = (d?.purchaserEmail || t.purchaserEmail || '').toString();
                      const currentEmail = (emailUsed||'').toString();
                      const effectiveHolder = holderEmail || purchaserEmail;
                      const ticketUsed = (d?.status || t.status) === 'used';
                      // For testing, allow activation regardless of titular; still block if used
                      const canActivateDyn = !ticketUsed;
                      const inviteInfo = 'Compartilhamento por imagem';
                      return (
                      <div key={t._id} style={{display:'flex', gap:12, alignItems:'center', border:'1px dashed #9ca3af', borderRadius:8, padding:12}}>
                        {(() => {
                          const src = t.qrDataUrl || (() => {
                            const origin = (typeof window !== 'undefined') ? window.location.origin : '';
                            const url = origin ? `${origin}/validator?id=${t._id}` : `/validator?id=${t._id}`;
                            return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(url)}`;
                          })();
                          return (
                            <img
                              src={src}
                              alt={`QR ${t._id}`}
                              style={{width:180, height:180, background:'#fff'}}
                            />
                          );
                        })()}
                        <div style={{flex:1}}>
                          <div><b>Evento:</b> {row.order.items?.[0]?.eventName || '-'}</div>
                          <div style={{marginTop:4}}><b>Tipo:</b> {t.ticketTypeName}</div>
                          <div style={{marginTop:4}}><b>Código:</b> <code>{t.code}</code></div>
                          <div style={{marginTop:6, fontSize:12, color:'#374151'}}>
                            <div><b>Titular:</b> {holderName || holderEmail || purchaserEmail || '-'}</div>
                            <div><b>Convite:</b> {inviteInfo}</div>
                            {ticketUsed && <div style={{color:'#b91c1c', fontWeight:700}}>Ingresso já utilizado</div>}
                          </div>
                          <div style={{marginTop:8}}>
                            {/* Formulário de titular: sempre visível */}
                            {(()=>{
                              const d = detailsMap[t._id] || {};
                              const nameVal = d.holderNameInput || d.holderName || '';
                              const cpfVal = d.holderCpfInput || '';
                              const savingKey = `saving_${t._id}`;
                              const saving = !!d[savingKey];
                              return (
                                <div style={{display:'grid', gap:8, gridTemplateColumns:'1fr 200px auto'}}>
                                  <input placeholder="Nome completo" value={nameVal}
                                    onChange={e=>setDetailsMap(prev=>({ ...prev, [t._id]: { ...(prev[t._id]||{}), holderNameInput: e.target.value } }))}
                                    style={{padding:'8px 10px', border:'1px solid #e5e7eb', borderRadius:8}} />
                                  <input placeholder="CPF (apenas números)" value={cpfVal}
                                    onChange={e=>setDetailsMap(prev=>({ ...prev, [t._id]: { ...(prev[t._id]||{}), holderCpfInput: e.target.value.replace(/\D/g,'') } }))}
                                    style={{padding:'8px 10px', border:'1px solid #e5e7eb', borderRadius:8}} />
                                  <button disabled={saving} onClick={async()=>{
                                    try{
                                      const current = detailsMap[t._id] || {};
                                      const name = (current.holderNameInput || current.holderName || '').toString();
                                      let cpf = (current.holderCpfInput || '').toString().replace(/\D/g,'');
                                      if (!name.trim()){ alert('Informe o nome completo.'); return; }
                                      if (!cpf || cpf.length!==11){ alert('Informe um CPF válido (11 dígitos).'); return; }
                                      setDetailsMap(prev=>({ ...prev, [t._id]: { ...(prev[t._id]||{}), [savingKey]: true } }));
                                      await api.post(`/tickets/${encodeURIComponent(t._id)}/bind-public`, { cpf, name });
                                      // Buscar dados atualizados
                                      let nd = {};
                                      try{ nd = (await api.get(`/tickets/${encodeURIComponent(t._id)}`)).data || {}; }catch{}
                                      setDetailsMap(prev=>({
                                        ...prev,
                                        [t._id]: {
                                          ...(prev[t._id]||{}),
                                          holderName: nd.holderName || name,
                                          holderCpfMasked: nd.holderCpfMasked || (cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '***.$2.$3-**')),
                                          holderNameInput: name,
                                          holderCpfInput: cpf,
                                          [savingKey]: false,
                                        }
                                      }));
                                      alert('Titular salvo no bilhete.');
                                    }catch(e){
                                      alert(e?.response?.data?.error || 'Falha ao salvar titular');
                                      setDetailsMap(prev=>({ ...prev, [t._id]: { ...(prev[t._id]||{}), [savingKey]: false } }));
                                    }
                                  }}
                                    style={{border:'1px solid #e5e7eb', background:'#fff', borderRadius:8, padding:'8px 12px', fontWeight:800}}>{saving?'Salvando...':'Salvar titular'}</button>
                                </div>
                              );
                            })()}
                          </div>
                          <div style={{marginTop:10, display:'flex', gap:8, flexWrap:'wrap'}}>
                            {(()=>{ const d = detailsMap[t._id] || {}; return !!d.holderCpfMasked; })() ? null : (
                              <div style={{color:'#b91c1c', fontSize:12, fontWeight:700}}>Preencha e salve Nome e CPF para habilitar o compartilhamento</div>
                            )}
                            <button disabled={!((detailsMap[t._id]||{}).holderCpfMasked)} onClick={async()=>{
                              let d = detailsMap[t._id] || {};
                              let name = (d.holderName || '').toString().trim();
                              let cpfMasked = (d.holderCpfMasked || '').toString();
                              if (!name || !cpfMasked){ alert('Salve Nome e CPF antes de compartilhar.'); return; }
                              await shareTicketSmart({
                                eventName: row.order.items?.[0]?.eventName || '-',
                                ticketType: t.ticketTypeName,
                                code: t.code,
                                ticketId: t._id,
                                qrDataUrl: t.qrDataUrl,
                                holderNameDisplay: name,
                                holderCpfMasked: cpfMasked,
                              });
                            }} style={{border:'1px solid #25D366', color:'#25D366', background:'#fff', borderRadius:6, padding:'6px 10px', fontWeight:700}}>WhatsApp (imagem)</button>

                            <button disabled={!((detailsMap[t._id]||{}).holderCpfMasked)} onClick={async()=>{
                              let d = detailsMap[t._id] || {};
                              let name = (d.holderName || '').toString().trim();
                              let cpfMasked = (d.holderCpfMasked || '').toString();
                              if (!name || !cpfMasked){ alert('Salve Nome e CPF antes de compartilhar.'); return; }
                              await shareTicketAsPdf({
                                eventName: row.order.items?.[0]?.eventName || '-',
                                ticketType: t.ticketTypeName,
                                code: t.code,
                                ticketId: t._id,
                                qrDataUrl: t.qrDataUrl,
                                holderNameDisplay: name,
                                holderCpfMasked: cpfMasked,
                              });
                            }}
                              style={{border:'1px solid #25D366', color:'#25D366', background:'#fff', borderRadius:6, padding:'6px 10px', fontWeight:700}}>WhatsApp (PDF)</button>

                            {/* Botão de link removido por solicitação */}

                            {/* Sem QR dinâmico/test token */}
                          </div>
                          {/* QR dinâmico removido por solicitação */}
                        </div>
                      </div>
                    );})}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

async function shareTicketAsPdf({ eventName, ticketType, code, ticketId, qrDataUrl }){
  try{
    const validateUrl = `${window.location.origin}/validator?id=${ticketId}`;
    if (!qrDataUrl) {
      alert('Não foi possível gerar o QR do bilhete para PDF. Atualize a página e tente novamente.');
      return;
    }

    // 1) Desenha o bilhete vertical (A6-ish) em canvas, garantindo same-origin com qrDataUrl
    const w = 1080, h = 1680; // retrato
    const pad = 60;
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    // fundo geral
    ctx.fillStyle = '#0f172a'; ctx.fillRect(0,0,w,h);
    // cartão branco
    const r = 36; const x=pad, y=pad, cw=w-pad*2, ch=h-pad*2;
    ctx.fillStyle = '#ffffff';
    roundRect(ctx, x, y, cw, ch, r, true, false);
    // cabeçalho colorido
    const headerH = 160; ctx.fillStyle = '#111827';
    roundRect(ctx, x, y, cw, headerH, {tl:r, tr:r, br:0, bl:0}, true, false);
    // logotipo textual
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 56px Inter, Arial'; ctx.fillText('Ingressos', x+40, y+100);
    // corpo
    const innerPad = 40; let cy = y + headerH + innerPad;
    ctx.fillStyle = '#0f172a'; ctx.font = '800 54px Inter, Arial';
    wrapText(ctx, eventName, x+innerPad, cy, cw - innerPad*2, 58); cy += 120;
    ctx.font = '600 42px Inter, Arial'; ctx.fillText(`Tipo: ${ticketType}`, x+innerPad, cy); cy += 60;
    ctx.font = '600 42px Inter, Arial'; ctx.fillText(`Código: ${code.slice(0,12)}…`, x+innerPad, cy); cy += 70;
    // QR central
    const qrSize = 560; const qx = x + (cw - qrSize)/2; const qy = cy;
    const qrImg = await loadImage(qrDataUrl);
    ctx.drawImage(qrImg, qx, qy, qrSize, qrSize);
    cy = qy + qrSize + 40;
    ctx.font = '500 34px Inter, Arial'; ctx.fillStyle = '#0f172a';
    wrapText(ctx, `Validar: ${validateUrl}`, x+innerPad, cy, cw - innerPad*2, 40); cy += 90;
    // linha de corte
    ctx.fillStyle = '#6b7280'; ctx.font = '400 30px Inter, Arial'; ctx.fillText('Apresente este bilhete na entrada do evento.', x+innerPad, cy);

    const pngBlob = await new Promise(res=>canvas.toBlob(res, 'image/png', 0.95));
    const pngBytes = new Uint8Array(await pngBlob.arrayBuffer());

    // 2) Monta PDF em memória (1 página) usando pdf-lib via npm
    const { PDFDocument, StandardFonts } = await importPdfLib();
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([w, h]);
    const pngEmbed = await pdfDoc.embedPng(pngBytes);
    page.drawImage(pngEmbed, { x:0, y:0, width:w, height:h });
    const pdfBytes = await pdfDoc.save();
    const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
    const file = new File([pdfBlob], `ingresso-${ticketId}.pdf`, { type:'application/pdf' });

    if (navigator.share && navigator.canShare && navigator.canShare({ files:[file] })){
      await navigator.share({ files:[file], title: `Ingresso - ${eventName}`, text: `${eventName} • ${ticketType}` });
    } else {
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url; a.download = `ingresso-${ticketId}.pdf`; a.click();
      setTimeout(()=>URL.revokeObjectURL(url), 3000);
    }
  }catch(e){
    console.error(e);
    alert('Falha ao gerar o PDF do bilhete.');
  }
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
  const words = text.split(' ');
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

// Helpers
async function importPdfLib(){
  if (typeof window === 'undefined') throw new Error('PDF only in browser');
  if (window.__PDFLIB__) return window.__PDFLIB__;
  const mod = await import('pdf-lib');
  window.__PDFLIB__ = mod;
  return mod;
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

// Mascara CPF mantendo apenas os 2 últimos dígitos
function maskCpf(cpf){
  const d = String(cpf||'').replace(/\D/g,'');
  if (d.length !== 11) return String(cpf||'');
  return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '***.***.***-$4');
}
