import { useEffect, useState } from 'react';
import api from '../../lib/api';
import { getToken, setToken, clearToken } from '../../lib/auth';
import DashboardLayout from '../../components/dashboard/DashboardLayout';

export default function Dashboard() {
  const [token, setTok] = useState(null);
  const [authMode] = useState('login'); // somente login
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);

  // Checadores (QR)
  const [checkers, setCheckers] = useState([]);
  const [checkerForm, setCheckerForm] = useState({ fullName:'', email:'', whatsapp:'', username:'', password:'' });

  // New/Edit Event State
  const emptyEvent = { name: '', description: '', date: '', location: '', imageUrl: '', cardImageUrl: '', featured: false, ticketTypes: [] };
  const [form, setForm] = useState(emptyEvent);
  const [editingId, setEditingId] = useState(null);
  const [ticketDraft, setTicketDraft] = useState({ name: '', price: '', quantity: '' });

  useEffect(() => {
    const t = getToken();
    if (t) {
      setTok(t);
      loadMyEvents();
      loadCheckers();
    }
  }, []);

  async function loadMyEvents() {
    try {
      const r = await api.get('/events/mine');
      setEvents(r.data);
    } catch (e) { console.error(e); }
  }

  async function loadCheckers(){
    try{ const r = await api.get('/checkers'); setCheckers(r.data||[]); }
    catch(e){ /* pode falhar se ADMIN_EMAIL não configurado */ }
  }

  async function createChecker(){
    try{
      const { fullName, email, whatsapp, username, password } = checkerForm;
      if (!fullName || !email || !username || !password){ alert('Preencha nome, email, usuário e senha'); return; }
      const r = await api.post('/checkers', { fullName, email, whatsapp, username, password });
      setCheckerForm({ fullName:'', email:'', whatsapp:'', username:'', password:'' });
      setCheckers(prev => [r.data, ...prev]);
      alert('Checador criado');
    }catch(e){ alert(e?.response?.data?.error || 'Falha ao criar checador'); }
  }

  async function removeChecker(id){
    if (!confirm('Remover este checador?')) return;
    try{ await api.delete(`/checkers/${encodeURIComponent(id)}`); setCheckers(prev=> prev.filter(c=>c._id!==id)); }
    catch(e){ alert(e?.response?.data?.error || 'Falha ao remover'); }
  }

  async function submitAuth(e) {
    if (e && e.preventDefault) e.preventDefault();
    setError('');
    const em = String(email).trim();
    const pw = String(password);
    if (!em || !pw) { setError('Informe seu email e senha.'); return; }
    setLoading(true);
    try {
      const r = await api.post('/auth/login', { email: em, password: pw });
      setToken(r.data.token); setTok(r.data.token);
      setName(''); setEmail(''); setPassword('');
      await loadMyEvents();
    } catch (e) {
      const msg = e?.response?.data?.error || 'Falha na autenticação';
      setError(msg);
    } finally { setLoading(false); }
  }

  function logout() {
    clearToken(); setTok(null); setEvents([]);
  }

  function addTicketType() {
    if (!ticketDraft.name || ticketDraft.price === '' || ticketDraft.quantity === '') {
      alert('Preencha nome, preço e quantidade');
      return;
    }
    const price = parseFloat(String(ticketDraft.price).replace(',', '.'));
    const quantity = parseInt(String(ticketDraft.quantity), 10);
    if (Number.isNaN(price) || Number.isNaN(quantity) || price < 0 || quantity <= 0) {
      alert('Preço ou quantidade inválidos');
      return;
    }
    setForm({
      ...form,
      ticketTypes: [...(form.ticketTypes||[]), { name: ticketDraft.name, price, quantity, sold: 0 }]
    });
    setTicketDraft({ name: '', price: '', quantity: '' });
  }

  function removeTicketType(idx) {
    setForm({ ...form, ticketTypes: form.ticketTypes.filter((_, i)=>i!==idx) });
  }

  function toIsoFromInputDate(val) {
    // Supports either 'YYYY-MM-DDTHH:mm' (datetime-local) or 'dd/MM/yyyy HH:mm'
    if (!val) return '';
    if (val.includes('T')) return val; // already good
    // try dd/MM/yyyy HH:mm
    try {
      const [dpart, hpart] = val.split(' ');
      const [dd, mm, yyyy] = dpart.split('/').map(Number);
      const [HH, MM] = (hpart || '00:00').split(':').map(Number);
      if (!dd || !mm || !yyyy) return val;
      const dt = new Date(yyyy, mm - 1, dd, HH || 0, MM || 0);
      const pad = (n)=> String(n).padStart(2,'0');
      return `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
    } catch { return val; }
  }

  async function saveEvent() {
    setLoading(true);
    try {
      const payload = {
        ...form,
        date: toIsoFromInputDate(form.date),
        ticketTypes: (form.ticketTypes||[]).map(t => ({
          name: t.name,
          price: typeof t.price === 'string' ? parseFloat(t.price.replace(',', '.')) : t.price,
          quantity: typeof t.quantity === 'string' ? parseInt(t.quantity,10) : t.quantity,
          sold: t.sold || 0,
        })),
      };
      if (!payload.name || !payload.date || !payload.location) {
        alert('Preencha nome, data e local');
        return;
      }
      if (payload.ticketTypes.some(t => Number.isNaN(t.price) || Number.isNaN(t.quantity))) {
        alert('Há tipos de ingresso com preço/quantidade inválidos');
        return;
      }
      if (editingId) {
        const r = await api.put(`/events/${editingId}`, payload);
        setEvents(evts => evts.map(e => e._id === editingId ? r.data : e));
      } else {
        const r = await api.post('/events', payload);
        setEvents(evts => [r.data, ...evts]);
      }
      await loadMyEvents();
      setForm(emptyEvent); setEditingId(null);
      alert('Evento salvo com sucesso');
    } catch (e) {
      const msg = e?.response?.data?.error || e?.message || 'Erro ao salvar evento';
      console.error('saveEvent error', e);
      alert(msg);
    } finally {
      setLoading(false);
    }
  }

  function editEvent(ev) {
    setEditingId(ev._id);
    setForm({
      name: ev.name,
      description: ev.description || '',
      date: new Date(ev.date).toISOString().slice(0,16),
      location: ev.location || '',
      imageUrl: ev.imageUrl || '',
      cardImageUrl: ev.cardImageUrl || '',
      featured: !!ev.featured,
      ticketTypes: ev.ticketTypes || []
    });
  }

  if (!token) {
    return (
      <div style={{minHeight:'100vh', background:'#f5f6f8', display:'grid', placeItems:'center', padding:16}}>
        <div style={{width:'100%', maxWidth:420, background:'#fff', border:'1px solid #e5e7eb', borderRadius:12, padding:20}}>
          <h1 style={{margin:'0 0 12px 0'}}>Dashboard do Organizador</h1>
          <div style={{marginBottom:10}}>
            <div style={{fontSize:12, color:'#6b7280'}}>Entre com seu email e senha de administrador</div>
          </div>
          {!!error && (
            <div style={{marginBottom:10, padding:'8px 10px', border:'1px solid #fecaca', background:'#fef2f2', color:'#991b1b', borderRadius:8, fontSize:13}}>{error}</div>
          )}
          <form onSubmit={submitAuth} style={{display:'grid', gap:12}}>
            <div>
              <label style={{display:'block', fontSize:12, color:'#6b7280'}}>Email</label>
              <input autoFocus placeholder="seu@email.com" value={email} onChange={e=>setEmail(e.target.value)} style={{width:'100%', padding:'10px 12px', border:'1px solid #e5e7eb', borderRadius:8}}/>
            </div>
            <div>
              <label style={{display:'block', fontSize:12, color:'#6b7280'}}>Senha</label>
              <div style={{position:'relative'}}>
                <input placeholder="••••••••" type={showPass? 'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} style={{width:'100%', padding:'10px 38px 10px 12px', border:'1px solid #e5e7eb', borderRadius:8}}/>
                <button type="button" onClick={()=>setShowPass(s=>!s)} aria-label="Mostrar senha" style={{position:'absolute', right:8, top:8, border:'1px solid #e5e7eb', background:'#fff', borderRadius:6, padding:'4px 8px', fontSize:12, cursor:'pointer'}}>{showPass? 'Ocultar':'Mostrar'}</button>
              </div>
            </div>
            <button type="submit" disabled={loading} style={{width:'100%', padding:'10px 14px', borderRadius:8, border:0, background: loading? '#6b7280':'#111827', color:'#fff', fontWeight:700}}>{loading? 'Entrando...' : 'Entrar'}</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout title="Dashboard do Organizador">
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16}}>
        {/* Coluna esquerda: Formulário novo/editar evento */}
        <div style={{background:'#fff', border:'1px solid #e5e7eb', borderRadius:12, padding:16}}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
            <h2 style={{margin:0, fontWeight:500, fontSize:20}}>{editingId ? 'Editar Evento' : 'Novo Evento'}</h2>
            <button onClick={logout} style={{border:'1px solid #e5e7eb', background:'#fff', borderRadius:8, padding:'6px 10px'}}>Sair</button>
          </div>

          <div style={{display:'grid', gap:10}}>
            <div>
              <label style={{display:'block', fontSize:12, color:'#6b7280'}}>Nome</label>
              <input placeholder="Nome do evento" value={form.name} onChange={e=>setForm({...form, name: e.target.value})} style={{width:'100%', padding:'10px 12px', border:'1px solid #e5e7eb', borderRadius:8}} />
            </div>
            <div>
              <label style={{display:'block', fontSize:12, color:'#6b7280'}}>Descrição</label>
              <textarea placeholder="Descrição" value={form.description} onChange={e=>setForm({...form, description: e.target.value})} style={{width:'100%', minHeight:84, padding:'10px 12px', border:'1px solid #e5e7eb', borderRadius:8}} />
            </div>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10}}>
              <div>
                <label style={{display:'block', fontSize:12, color:'#6b7280'}}>Data e hora</label>
                <input type="datetime-local" value={form.date} onChange={e=>setForm({...form, date: e.target.value})} style={{width:'100%', padding:'10px 12px', border:'1px solid #e5e7eb', borderRadius:8}} />
              </div>
              <div>
                <label style={{display:'block', fontSize:12, color:'#6b7280'}}>Local</label>
                <input placeholder="Ex: Arena" value={form.location} onChange={e=>setForm({...form, location: e.target.value})} style={{width:'100%', padding:'10px 12px', border:'1px solid #e5e7eb', borderRadius:8}} />
              </div>
            </div>
            <div>
              <label style={{display:'block', fontSize:12, color:'#6b7280'}}>Imagem (URL) — Banner grande</label>
              <input placeholder="https://..." value={form.imageUrl} onChange={e=>setForm({...form, imageUrl: e.target.value})} style={{width:'100%', padding:'10px 12px', border:'1px solid #e5e7eb', borderRadius:8}} />
              <div style={{marginTop:6, fontSize:12, color:'#6b7280'}}>Sugestão de tamanho: <b>1920x600 px</b> (até ~500 KB). Formatos: JPG/PNG/WebP.</div>
              <div style={{marginTop:8, display:'flex', gap:8, alignItems:'center'}}>
                <label style={{border:'1px solid #e5e7eb', borderRadius:8, padding:'6px 10px', background:'#fff', cursor:'pointer'}}>
                  Enviar arquivo
                  <input type="file" accept="image/*" style={{display:'none'}} onChange={async(e)=>{
                    const f = e.target.files?.[0];
                    if(!f) return;
                    const fd = new FormData();
                    fd.append('file', f);
                    try{
                      const r = await api.post('/uploads', fd, { headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${localStorage.getItem('token')||''}` } });
                      setForm(v=>({ ...v, imageUrl: r.data.url }));
                    }catch(err){
                      const msg = err?.response?.data?.error || err?.message || 'Falha ao enviar';
                      alert(msg);
                    }
                    finally{ e.target.value=''; }
                  }}/>
                </label>
              </div>
            </div>

            <div>
              <label style={{display:'flex', alignItems:'center', gap:8, fontSize:13}}>
                <input type="checkbox" checked={!!form.featured} onChange={e=>setForm({...form, featured: e.target.checked})} />
                Destacar no banner (Home)
              </label>
            </div>

            <div>
              <label style={{display:'block', fontSize:12, color:'#6b7280'}}>Imagem do Card (URL) — Miniatura</label>
              <input placeholder="https://..." value={form.cardImageUrl} onChange={e=>setForm({...form, cardImageUrl: e.target.value})} style={{width:'100%', padding:'10px 12px', border:'1px solid #e5e7eb', borderRadius:8}} />
              <div style={{marginTop:6, fontSize:12, color:'#6b7280'}}>Sugestão de tamanho: <b>600x400 px</b> (até ~200 KB). Formatos: JPG/PNG/WebP.</div>
              <div style={{marginTop:8, display:'flex', gap:8, alignItems:'center'}}>
                <label style={{border:'1px solid #e5e7eb', borderRadius:8, padding:'6px 10px', background:'#fff', cursor:'pointer'}}>
                  Enviar arquivo
                  <input type="file" accept="image/*" style={{display:'none'}} onChange={async(e)=>{
                    const f = e.target.files?.[0];
                    if(!f) return;
                    const fd = new FormData();
                    fd.append('file', f);
                    try{
                      const r = await api.post('/uploads', fd, { headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${localStorage.getItem('token')||''}` } });
                      setForm(v=>({ ...v, cardImageUrl: r.data.url }));
                    }catch(err){
                      const msg = err?.response?.data?.error || err?.message || 'Falha ao enviar';
                      alert(msg);
                    }
                    finally{ e.target.value=''; }
                  }}/>
                </label>
              </div>
            </div>

            <div style={{border:'1px solid #e5e7eb', borderRadius:10, padding:12}}>
              <div style={{fontWeight:500, marginBottom:8}}>Tipos de Ingresso</div>
              {(form.ticketTypes || []).map((t, idx) => (
                <div key={idx} style={{display:'flex', gap:8, alignItems:'center', marginTop:6}}>
                  <div style={{flex:1}}>{t.name} — R$ {Number(t.price).toFixed(2)} — Qtde: {t.quantity} — Vendidos: {t.sold||0}</div>
                  <button onClick={()=>removeTicketType(idx)} style={{border:'1px solid #e5e7eb', background:'#fff', borderRadius:8, padding:'6px 10px'}}>Remover</button>
                </div>
              ))}
              <div style={{display:'grid', gridTemplateColumns:'1.2fr .8fr .6fr auto', gap:8, marginTop:8}}>
                <input placeholder="Nome" value={ticketDraft.name} onChange={e=>setTicketDraft({...ticketDraft, name: e.target.value})} style={{padding:'10px 12px', border:'1px solid #e5e7eb', borderRadius:8}} />
                <input type="text" placeholder="Preço (ex: 50,00 ou 50.00)" value={ticketDraft.price} onChange={e=>{
                  const val = e.target.value.replace(',', '.');
                  if (val !== '' && Number.isNaN(parseFloat(val))) return;
                  setTicketDraft({...ticketDraft, price: val});
                }} style={{padding:'10px 12px', border:'1px solid #e5e7eb', borderRadius:8}} />
                <input type="number" min="1" placeholder="Quantidade" value={ticketDraft.quantity} onChange={e=>setTicketDraft({...ticketDraft, quantity: e.target.value})} style={{padding:'10px 12px', border:'1px solid #e5e7eb', borderRadius:8}} />
                <button onClick={addTicketType} style={{padding:'10px 12px', borderRadius:8, border:'1px solid #e5e7eb', background:'#fff'}}>Adicionar</button>
              </div>
            </div>

            <div style={{display:'flex', justifyContent:'flex-end'}}>
              <button disabled={loading} onClick={saveEvent} style={{background:'#111827', color:'#fff', border:0, padding:'10px 14px', borderRadius:10, fontWeight:600}}>{loading ? 'Salvando...' : (editingId ? 'Salvar alterações' : 'Criar Evento')}</button>
            </div>
          </div>
        </div>

        {/* Coluna direita: Meus eventos */}
        <div>
          <h2 style={{marginTop:0, fontSize:24, fontWeight:500, letterSpacing:.2}}>Meus Eventos</h2>
          <div style={{display:'grid', gap:12}}>
            {events.map((ev) => (
              <div key={ev._id} style={{background:'#fff', border:'1px solid #e5e7eb', borderRadius:10, padding:12}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                  <div>
                    <div style={{fontWeight:500, fontSize:17, lineHeight:1.2}}>{ev.name}</div>
                    <div style={{color:'#6b7280', fontSize:14, marginTop:2}}>{new Date(ev.date).toLocaleString()} — {ev.location}</div>
                  </div>
                  <div>
                    <button onClick={()=>editEvent(ev)} style={{border:'1px solid #e5e7eb', background:'#fff', borderRadius:8, padding:'6px 10px'}}>Editar</button>
                  </div>
                </div>
                <Metrics eventId={ev._id} />
              </div>
            ))}
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}

function Metrics({ eventId }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    api.get(`/events/${eventId}/metrics`).then(r => setData(r.data)).catch(() => {});
  }, [eventId]);
  if (!data) return <div style={{marginTop:8, color:'#6b7280', fontSize:13}}>Carregando métricas...</div>;
  return (
    <div style={{marginTop:10, fontSize:13, lineHeight:1.45}}>
      <div><span style={{color:'#6b7280'}}>Total disponíveis:</span> <b>{data.totalAvailable}</b></div>
      <div><span style={{color:'#6b7280'}}>Total vendidos:</span> <b>{data.totalSold}</b></div>
      <div><span style={{color:'#6b7280'}}>Utilizados:</span> <b>{data.used}</b></div>
      <div style={{marginTop:8}}>
        <div style={{fontWeight:700}}>Por tipo:</div>
        <ul style={{margin:'6px 0 0 16px'}}>
          {data.byType.map((t, idx) => (
            <li key={idx} style={{margin:'2px 0'}}>{t.name}: <b>{t.sold || 0}</b>/{t.quantity}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
