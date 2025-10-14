import { useEffect, useMemo, useState } from 'react';
import { useCart } from '../context/CartContext';
import api from '../lib/api';
import { setToken } from '../lib/auth';

export default function Checkout() {
  const { items, total, clear, increase, decrease, setQuantity, removeItem } = useCart();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [showExtras, setShowExtras] = useState(false); // CPF/Telefone opcionais
  const [phone, setPhone] = useState('');
  // Endereço removido para simplificar o checkout (não é necessário para PIX)
  const [cardNumber, setCardNumber] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [protect, setProtect] = useState('no');
  const [paymentMethod, setPaymentMethod] = useState('pix'); // card | pix
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [mpLoading, setMpLoading] = useState(false);
  const [pix, setPix] = useState(null);
  const [pixStatus, setPixStatus] = useState(null);
  const [polling, setPolling] = useState(false);
  const [expiresIn, setExpiresIn] = useState(null); // seconds
  const [showPixDetails, setShowPixDetails] = useState(false);
  const [pendingSince, setPendingSince] = useState(null);
  const confirmManually = async () => {
    if (!items?.length) return;
    try{
      try{ localStorage.setItem('lastPurchaserEmail', email||''); }catch{}
      try{ if (email) setToken(email); }catch{}
      try{ localStorage.setItem('mpPending', JSON.stringify({ purchaserName: name, purchaserEmail: email, items })); }catch{}
      await api.post('/payments/mp/confirm', { purchaserName: name, purchaserEmail: email, items });
      if (typeof window !== 'undefined') window.location.href = '/checkout/success';
    }catch(e){
      alert('Falha ao confirmar manualmente');
    }
  };
  const checkPixNow = async () => {
    if (!pix?.id) return;
    try{
      let s;
      try {
        s = await api.get(`/payments/mp/status/${pix.id}`);
      } catch (e) {
        if (e?.response?.status === 404) {
          // fallback to query style
          s = await api.get(`/payments/mp/status`, { params: { id: pix.id } });
        } else { throw e; }
      }
      setPixStatus(s.data);
      if (s.data?.status === 'approved'){
        try{ localStorage.setItem('lastPurchaserEmail', email||''); }catch{}
        try{ if (email) setToken(email); }catch{}
        try{ localStorage.setItem('mpPending', JSON.stringify({ purchaserName: name, purchaserEmail: email, items })); }catch{}
        // backend já auto-confirma na rota de status; apenas redirecionar
        if (typeof window !== 'undefined') window.location.href = '/checkout/success';
      }
      // dev-only fallback: auto-confirm if stuck pending for >45s under trycloudflare
      const isDevTunnel = typeof window !== 'undefined' && /trycloudflare\.com$/i.test(window.location.hostname);
      if (isDevTunnel && (s.data?.status || 'pending') === 'pending'){
        const now = Date.now();
        if (!pendingSince) setPendingSince(now);
        const elapsed = (pendingSince ? (now - pendingSince) : 0);
        if (elapsed > 45000) {
          try{
            await api.post('/payments/mp/confirm', { purchaserName: name, purchaserEmail: email, items });
            if (typeof window !== 'undefined') window.location.href = '/checkout/success';
          }catch{}
        }
      } else {
        setPendingSince(null);
      }
    }catch{}
  };

  // Auto polling while waiting PIX
  useEffect(()=>{
    if (!polling || !pix?.id) return;
    const iv = setInterval(()=>{ checkPixNow(); }, 8000);
    return ()=>clearInterval(iv);
  }, [polling, pix?.id]);

  const feeRate = 0.10;
  const subtotal = useMemo(()=> items.reduce((s,i)=> s + i.quantity * i.unitPrice, 0), [items]);
  const fee = useMemo(()=> subtotal * feeRate, [subtotal]);
  const grandTotal = useMemo(()=> subtotal + fee, [subtotal, fee]);

  const submit = async () => {
    setLoading(true);
    try {
      const payload = {
        purchaserName: name,
        purchaserEmail: email,
        items: items.map(i => ({ eventId: i.eventId, ticketTypeName: i.ticketTypeName, quantity: i.quantity })),
        payment: { cardNumber },
      };

  // Poll PIX payment status and confirm order when approved
  useEffect(() => {
    if (!pix?.id || !polling) return;
    const id = pix.id;
    let stop = false;
    const iv = setInterval(async () => {
      try{
        let s;
        try {
          s = await api.get(`/payments/mp/status/${id}`);
        } catch (e) {
          if (e?.response?.status === 404) {
            s = await api.get(`/payments/mp/status`, { params: { id } });
          } else { throw e; }
        }
        setPixStatus(s.data);
        if (s.data?.status === 'approved'){
          clearInterval(iv); stop = true; setPolling(false);
          // backend já auto-confirma na rota de status
          if (typeof window !== 'undefined') window.location.href = '/checkout/success';
        }
        // dev-only fallback pending >45s
        const isDevTunnel = typeof window !== 'undefined' && /trycloudflare\.com$/i.test(window.location.hostname);
        if (isDevTunnel && (s.data?.status || 'pending') === 'pending'){
          const now = Date.now();
          if (!pendingSince) setPendingSince(now);
          const elapsed = (pendingSince ? (now - pendingSince) : 0);
          if (elapsed > 45000) {
            clearInterval(iv); stop = true; setPolling(false);
            try{
              await api.post('/payments/mp/confirm', { purchaserName: name, purchaserEmail: email, items });
            }catch{}
            if (typeof window !== 'undefined') window.location.href = '/checkout/success';
          }
        } else {
          setPendingSince(null);
        }
      }catch(e){ /* ignore one-off errors */ }
    }, 8000);
    return () => { if (!stop) clearInterval(iv); };
  }, [pix?.id, polling, name, email, items]);

  // Countdown for PIX expiration, if provided
  useEffect(() => {
    if (expiresIn == null) return;
    if (expiresIn <= 0) return; // expired
    const iv = setInterval(() => {
      setExpiresIn((s) => (s && s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(iv);
  }, [expiresIn]);
      const r = await api.post('/orders', payload);
      if (typeof window !== 'undefined') { console.log('ORDER RESULT', r.data); }
      setResult(r.data);
      if (r.data?.order?.status === 'paid') clear();
    } catch (e) {
      setResult({ error: 'Falha no pedido' });
    } finally {
      setLoading(false);
    }
  };

  const payWithMercadoPago = async () => {
    if (items.length === 0) return;
    if (!acceptTerms) { alert('Você precisa aceitar os termos de uso.'); return; }
    setMpLoading(true);
    try {
      const payload = {
        purchaserName: name,
        purchaserEmail: email,
        ...(showExtras && cpf ? { payerCpf: (cpf||'').replace(/\D+/g,'').slice(0,11) } : {}),
        ...(showExtras && phone ? { payerPhone: phone } : {}),
        items: items.map(i => ({ eventId: i.eventId, ticketTypeName: i.ticketTypeName, quantity: i.quantity, unitPrice: i.unitPrice, eventName: i.eventName })),
        total: grandTotal,
        paymentMethod,
      };
      if (paymentMethod === 'pix'){
        const r = await api.post('/payments/mp/create_pix', payload, {
          headers: { 'x-public-base': typeof window!== 'undefined' ? window.location.origin : undefined }
        });
        try{ localStorage.setItem('lastPurchaserEmail', email||''); }catch{}
        setPix(r.data);
        setPixStatus({ status: r.data.status, status_detail: r.data.status_detail });
        if (r.data?.expiration_date){
          try{
            const exp = new Date(r.data.expiration_date).getTime();
            const now = Date.now();
            setExpiresIn(Math.max(0, Math.floor((exp - now)/1000)));
          }catch{ setExpiresIn(null); }
        }
        setPolling(true);
      } else {
        // Persist pending data so we can confirm after redirect
        if (typeof window !== 'undefined') {
          localStorage.setItem('mpPending', JSON.stringify(payload));
        }
        const r = await api.post('/payments/mp/create_preference', payload, {
          headers: { 'x-public-base': typeof window!== 'undefined' ? window.location.origin : undefined }
        });
        if (r.data?.init_point) {
          window.location.href = r.data.init_point; // redirect to MP Checkout Pro
        } else if (r.data?.sandbox_init_point) {
          window.location.href = r.data.sandbox_init_point;
        } else {
          alert('Não foi possível iniciar o checkout do Mercado Pago');
        }
      }
    } catch (e) {
      const data = e?.response?.data;
      const rawDetail = data?.detail ?? data?.message ?? null;
      const detail = typeof rawDetail === 'object' ? JSON.stringify(rawDetail, null, 2) : (rawDetail || '');
      const causeText = Array.isArray(data?.cause) && data.cause.length ? `\nCausa: ${data.cause.map(c=>c.description||c.code).join(', ')}` : '';
      alert((data?.error || 'Falha ao iniciar Mercado Pago') + (detail? `\n${detail}` : '') + causeText);
      setResult({ error: data?.error || 'Falha ao iniciar Mercado Pago', detail: rawDetail || null, cause: data?.cause || null });
    } finally { setMpLoading(false); }
  };

  return (
    <div className="checkout-page">
      <h1>Finalizar pedido</h1>
      {items.length === 0 && <div>Seu carrinho está vazio.</div>}
      {items.length > 0 && (
        <div className="grid">
          {/* Coluna principal */}
          <div className="col-main">
            {/* Informações pessoais */}
            <div className="card">
              <div className="card-title">Informações pessoais</div>
              <div className="muted">Manter seu cadastro atualizado ajuda na aprovação do pagamento.</div>
              <div className="form-grid">
                <div>
                  <label>Nome</label>
                  <input placeholder="Seu nome" value={name} onChange={e=>setName(e.target.value)} />
                </div>
                <div>
                  <label>Email</label>
                  <input placeholder="seu@email.com" value={email} onChange={e=>setEmail(e.target.value)} />
                </div>
              </div>
              <div style={{marginTop:8}}>
                <button type="button" className="btn-link" onClick={()=>setShowExtras(s=>!s)}>
                  {showExtras ? 'Ocultar dados adicionais' : 'Informar dados adicionais (opcional)'}
                </button>
                {showExtras && (
                  <div style={{marginTop:8}}>
                    <div style={{marginTop:8}}>
                      <label>CPF (opcional)</label>
                      <input placeholder="000.000.000-00" value={cpf} onChange={e=>setCpf(e.target.value)} />
                    </div>
                    <div style={{marginTop:8}}>
                      <label>Telefone (opcional)</label>
                      <input placeholder="(11) 99999-9999" value={phone} onChange={e=>setPhone(e.target.value)} />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Forma de pagamento */}
            <div className="card">
              <div className="card-title">Forma de pagamento</div>
              <div className="pay-methods">
                <label className={`pm ${paymentMethod==='pix'?'active':''}`}>
                  <input type="radio" name="pm" checked={paymentMethod==='pix'} onChange={()=>setPaymentMethod('pix')} />
                  <span>PIX</span>
                </label>
                <label className={`pm ${paymentMethod==='card'?'active':''}`}>
                  <input type="radio" name="pm" checked={paymentMethod==='card'} onChange={()=>setPaymentMethod('card')} />
                  <span>Cartão de Crédito (via MP)</span>
                </label>
              </div>
              {paymentMethod==='card' && (
                <div className="form-inline">
                  <label>Número do cartão (simulado)</label>
                  <input placeholder="**** **** **** ****" value={cardNumber} onChange={e=>setCardNumber(e.target.value)} />
                </div>
              )}
              {paymentMethod==='pix' && !pix && (
                <div className="muted" style={{marginTop:8}}>Clique em "Gerar PIX" para exibir o QR code e o código copia e cola.</div>
              )}
              {paymentMethod==='pix' && pix && (
                <div className={`pix-box ${pixStatus?.status==='approved' ? 'ok' : ''}`}>
                  <div className="pix-grid">
                    {(() => {
                      const code = pix.qr_code || pix.copy_and_paste;
                      if (pix.qr_code_base64) {
                        return (<img src={`data:image/png;base64,${pix.qr_code_base64}`} alt="QR PIX" className="pix-qr" />);
                      }
                      if (code) {
                        const url = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(code)}`;
                        return (<img src={url} alt="QR PIX" className="pix-qr" />);
                      }
                      return null;
                    })()}
                    <div className="pix-info">
                      <div className="pix-title">PIX - Copia e Cola</div>
                      {typeof expiresIn === 'number' && (
                        <div className="pix-badge">Expira em {String(Math.floor(expiresIn/60)).padStart(2,'0')}:{String(expiresIn%60).padStart(2,'0')}</div>
                      )}
                      <textarea readOnly value={pix.copy_and_paste || pix.qr_code} className="pix-text" />
                      <div className="pix-actions">
                        <button onClick={()=>{ navigator.clipboard.writeText(pix.copy_and_paste || pix.qr_code); }}>Copiar código</button>
                        {pix.ticket_url && <a href={pix.ticket_url} target="_blank" rel="noreferrer" className="btn-link">Abrir no app</a>}
                      </div>
                      {pixStatus && (
                        <div className="muted" style={{marginTop:8}}>
                          Status: <b>{pixStatus.status || 'pendente'}</b> {pixStatus.status_detail? `(${pixStatus.status_detail})` : ''}
                        </div>
                      )}
                      {pix?.id && (
                        <div className="muted" style={{marginTop:4}}>payment_id: <code>{pix.id}</code></div>
                      )}
                      
                      <div className="muted" style={{marginTop:8}}>Após o pagamento, você será direcionado para a confirmação.</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Compra protegida - upsell */}
            <div className="card">
              <div className="upsell">
                <div className="upsell-title">Compra Protegida por apenas R$ 1,65</div>
                <div className="upsell-desc">Garanta o reembolso do pedido caso tenha algum imprevisto e não possa ir ao evento.</div>
                <div className="upsell-choices">
                  <label className="choice"><input type="radio" name="protect" checked={protect==='yes'} onChange={()=>setProtect('yes')} /> <span>Sim, quero proteção</span></label>
                  <label className="choice"><input type="radio" name="protect" checked={protect==='no'} onChange={()=>setProtect('no')} /> <span>Não, estou ciente dos riscos</span></label>
                </div>
              </div>
            </div>
          </div>

          {/* Coluna lateral: revisão */}
          <div className="col-side">
            <div className="card">
              <div className="card-title">Revisão do pedido</div>
              <div className="review">
                {items.map((it, idx)=> (
                  <div key={idx} className="item">
                    <div className="i-left">
                      <div className="name">{it.eventName}</div>
                      <div className="meta">{it.ticketTypeName}</div>
                    </div>
                    <div className="qty">
                      <button aria-label="diminuir" onClick={()=>decrease(idx)}>−</button>
                      <input aria-label="quantidade" value={it.quantity} onChange={e=>setQuantity(idx, e.target.value)} />
                      <button aria-label="aumentar" onClick={()=>increase(idx)}>+</button>
                    </div>
                    <div className="price">R$ {(it.quantity*it.unitPrice).toFixed(2)}</div>
                    <button className="remove" aria-label="remover" onClick={()=>removeItem(idx)}>×</button>
                  </div>
                ))}
                <div className="sep" />
                <div className="review-row"><div>Subtotal</div><div className="price">R$ {subtotal.toFixed(2)}</div></div>
                <div className="review-row"><div>Taxa</div><div className="price">R$ {fee.toFixed(2)}</div></div>
                <div className="total">TOTAL R$ {grandTotal.toFixed(2)}</div>
                <label className="terms">
                  <input type="checkbox" checked={acceptTerms} onChange={e=>setAcceptTerms(e.target.checked)} />
                  <span>Eu li e aceito os Termos de Uso</span>
                </label>
                <button className="cta" disabled={!acceptTerms || mpLoading} onClick={payWithMercadoPago}>{mpLoading? 'Processando...' : (paymentMethod==='pix' ? (pix? 'Gerado' : 'Gerar PIX') : 'Finalizar compra')}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {result && (
        <div className="result">
          <h3>Resultado</h3>
          {result.error && <div className="error">{result.error}</div>}
          {result.detail && (
            <pre style={{whiteSpace:'pre-wrap', background:'#f9fafb', border:'1px solid #e5e7eb', borderRadius:8, padding:12}}>
{typeof result.detail === 'object' ? JSON.stringify(result.detail, null, 2) : String(result.detail)}
            </pre>
          )}
          {result.cause && Array.isArray(result.cause) && (
            <div className="muted">Causas: {result.cause.map((c,i)=>c?.description||c?.code||`#${i}`).join('; ')}</div>
          )}
        </div>
      )}

      <style jsx>{`
        .checkout-page{ padding:16px }
        .grid{ display:grid; grid-template-columns: 1.6fr .9fr; gap:16px }
        .card{ background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:16px }
        .card-title{ font-weight:800; margin-bottom:8px }
        .muted{ color:#6b7280; font-size:12px; margin-bottom:10px }
        .form-grid{ display:grid; grid-template-columns:1fr 1fr; gap:12px }
        label{ display:block; font-size:12px; color:#6b7280; margin-bottom:4px }
        input{ width:100%; padding:10px 12px; border:1px solid #e5e7eb; border-radius:8px }
        .btn-link{ background:transparent; border:0; color:#2563eb; cursor:pointer; padding:0 }
        .pay-methods{ display:flex; gap:12px; margin-top:8px }
        .pm{ display:flex; align-items:center; gap:8px; padding:10px 12px; border:1px solid #e5e7eb; border-radius:10px; cursor:pointer; background:#f9fafb }
        .pm.active{ outline:2px solid #93c5fd; background:#fff }
        .form-inline{ margin-top:12px }
        .pix-box{ margin-top:12px }
        .pix-grid{ display:grid; grid-template-columns: 180px 1fr; gap:12px; align-items:flex-start }
        .pix-qr{ width:180px; height:180px; object-fit:contain; background:#fff; border:1px solid #e5e7eb; border-radius:8px }
        .pix-info{ display:flex; flex-direction:column }
        .pix-title{ font-weight:800; margin-bottom:6px }
        .pix-text{ width:100%; height:100px; padding:8px; border:1px solid #e5e7eb; border-radius:8px; font-family: monospace }
        .pix-actions{ display:flex; gap:8px; margin-top:8px }
        .upsell-title{ font-weight:800; color:#b45309 }
        .upsell-desc{ color:#6b7280; font-size:12px; margin:6px 0 8px }
        .choice{ display:flex; align-items:center; gap:8px; margin:6px 0 }
        .review .review-row{ display:flex; justify-content:space-between; align-items:center; margin:6px 0 }
        .review .item{ display:grid; grid-template-columns: 1fr auto auto auto; align-items:center; gap:8px; padding:8px 0 }
        .i-left{ min-width:0 }
        .qty{ display:flex; align-items:center; gap:6px }
        .qty button{ width:28px; height:28px; border-radius:6px; border:1px solid #e5e7eb; background:#fff; font-weight:800 }
        .qty input{ width:46px; text-align:center; padding:8px; border:1px solid #e5e7eb; border-radius:8px }
        .remove{ border:0; background:transparent; color:#9ca3af; font-size:18px; cursor:pointer }
        .review .name{ font-weight:600 }
        .review .meta{ color:#6b7280; font-size:12px }
        .review .price{ font-weight:700 }
        .review .sep{ height:1px; background:#e5e7eb; margin:8px 0 }
        .review .total{ margin-top:8px; font-size:18px; font-weight:800; color:#065f46 }
        .terms{ display:flex; align-items:center; gap:8px; margin:10px 0; font-size:12px }
        .cta{ width:100%; background:#00AF42; color:#fff; border:0; padding:12px; border-radius:10px; font-weight:800; cursor:pointer; box-shadow:0 4px 14px rgba(0,175,66,.25) }
        .cta:hover{ filter:brightness(.96) }
        .cta:disabled{ background:#94d3ad; cursor:not-allowed; box-shadow:none }
        @media (max-width: 900px){ .grid{ grid-template-columns:1fr; } }
      `}</style>
    </div>
  );
}
