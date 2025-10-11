import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import api from '../../lib/api';
import { getToken } from '../../lib/auth';

export default function SettingsPage(){
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ paymentProvider:'none', pixKey:'', apiKey:'', mpPublicKey:'', webhookUrl:'', logoUrl:'' });
  const [logged, setLogged] = useState(null);
  // Admin account
  const [adminInfo, setAdminInfo] = useState({ name: '', email: '' });
  const [adminSaving, setAdminSaving] = useState(false);
  const [whoami, setWhoami] = useState({ role: '' });

  useEffect(()=>{ setLogged(!!getToken()); },[]);
  useEffect(()=>{
    if(logged!==true){ if(logged===false) setLoading(false); return; }
    // settings
    api.get('/settings/me').then(r=>{
      setForm({ paymentProvider: r.data?.paymentProvider||'none', pixKey:r.data?.pixKey||'', apiKey:r.data?.apiKey||'', mpPublicKey:r.data?.mpPublicKey||'', webhookUrl:r.data?.webhookUrl||'', logoUrl: r.data?.logoUrl || '' });
    }).finally(()=>setLoading(false));
    // admin
    api.get('/admin/me').then(r=>{
      setAdminInfo({ name: r.data?.name || '', email: r.data?.email || '' });
    }).catch(()=>{});
    // whoami (para saber papel)
    api.get('/admin/whoami').then(r=>{ setWhoami({ role: r.data?.role || '' }); }).catch(()=>{});
  },[logged]);

  async function save(){
    setSaving(true);
    try{
      const payload = { ...form };
      await api.put('/settings/me', payload);
      alert('Configurações salvas');
    }catch(e){
      alert(e?.response?.data?.error || 'Falha ao salvar');
    }finally{ setSaving(false); }
  }

  async function promoteSelf(){
    try{
      const r = await api.post('/admin/promote-self');
      if (r?.data?.ok){
        setWhoami({ role: 'organizer' });
        alert('Você agora é o organizador. Recarregue a página se necessário.');
      } else {
        alert(r?.data?.error || 'Não foi possível promover.');
      }
    }catch(e){
      alert(e?.response?.data?.error || 'Falha ao promover');
    }
  }

  async function saveAdmin(){
    setAdminSaving(true);
    try{
      const payload = { name: adminInfo.name };
      const newPass = (document.getElementById('adminNewPass')?.value||'').trim();
      if (newPass) payload.password = newPass;
      await api.put('/admin/me', payload);
      if (newPass) {
        try{ document.getElementById('adminNewPass').value=''; }catch{}
        alert('Nome e senha atualizados. Faça login novamente se necessário.');
      } else {
        alert('Nome atualizado.');
      }
    }catch(e){
      alert(e?.response?.data?.error || 'Falha ao atualizar dados do admin');
    }finally{ setAdminSaving(false); }
  }

  if(logged===null){
    return (
      <DashboardLayout title="Configurações">
        <div>Carregando...</div>
      </DashboardLayout>
    );
  }

  if(!logged){
    return (
      <DashboardLayout title="Configurações">
        <div>Você precisa entrar no <a href="/dashboard">Dashboard</a> para editar as configurações.</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Configurações">
      {loading ? (
        <div>Carregando...</div>
      ) : (
        <div style={{maxWidth:640, background:'#fff', border:'1px solid #e5e7eb', borderRadius:12, padding:16}}>
          <div style={{display:'grid', gap:12}}>
            {/* Conta do Administrador */}
            <div style={{border:'1px solid #e5e7eb', borderRadius:12, padding:12}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <h3 style={{margin:0, fontWeight:500}}>Conta do Administrador</h3>
                <span style={{fontSize:13, color:'#6b7280'}}>{adminInfo.email || ''} {whoami.role && `• papel: ${whoami.role}`}</span>
              </div>
              <div style={{display:'grid', gap:10, marginTop:8}}>
                {whoami.role !== 'organizer' && (
                  <div style={{display:'flex', justifyContent:'flex-end'}}>
                    <button onClick={promoteSelf} className="btn" style={{border:'1px solid #e5e7eb', background:'#fff', borderRadius:8, padding:'8px 12px', fontWeight:700}}>Tornar-se organizador</button>
                  </div>
                )}
                <div>
                  <label style={{display:'block', fontSize:13, color:'#6b7280'}}>Nome</label>
                  <input value={adminInfo.name} onChange={e=>setAdminInfo(v=>({...v, name:e.target.value}))} placeholder="Seu nome" style={{width:'100%', padding:'10px 12px', border:'1px solid #e5e7eb', borderRadius:8}} />
                </div>
                <div>
                  <label style={{display:'block', fontSize:13, color:'#6b7280'}}>Nova senha (opcional)</label>
                  <input id="adminNewPass" type="password" placeholder="••••••••" style={{width:'100%', padding:'10px 12px', border:'1px solid #e5e7eb', borderRadius:8}} />
                </div>
                <div style={{display:'flex', justifyContent:'flex-end'}}>
                  <button disabled={adminSaving} onClick={saveAdmin} style={{background:'#111827', color:'#fff', border:0, padding:'8px 12px', borderRadius:8, fontWeight:700}}>
                    {adminSaving ? 'Salvando...' : 'Salvar dados do admin'}
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label style={{display:'block', fontSize:13, color:'#6b7280'}}>Provedor de Pagamento</label>
              <select value={form.paymentProvider} onChange={e=>setForm({...form, paymentProvider: e.target.value})} style={{width:'100%', padding:'10px 12px', border:'1px solid #e5e7eb', borderRadius:8}}>
                <option value="none">Nenhum</option>
                <option value="pix">Pix</option>
                <option value="mercadopago">Mercado Pago</option>
                <option value="pagarme">Pagar.me</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            {form.paymentProvider === 'pix' && (
              <div>
                <label style={{display:'block', fontSize:13, color:'#6b7280'}}>Chave Pix</label>
                <input placeholder="Sua chave Pix" value={form.pixKey} onChange={e=>setForm({...form, pixKey:e.target.value})} style={{width:'100%', padding:'10px 12px', border:'1px solid #e5e7eb', borderRadius:8}} />
              </div>
            )}

            <div>
              <label style={{display:'block', fontSize:13, color:'#6b7280'}}>Logo (URL da imagem)</label>
              <input placeholder="https://.../logo.png" value={form.logoUrl} onChange={e=>setForm({...form, logoUrl:e.target.value})} style={{width:'100%', padding:'10px 12px', border:'1px solid #e5e7eb', borderRadius:8}} />
              <div style={{marginTop:8, display:'flex', gap:8, alignItems:'center'}}>
                <label className="btn-upload" style={{border:'1px solid #e5e7eb', borderRadius:8, padding:'6px 10px', background:'#fff', cursor:'pointer'}}>
                  Enviar arquivo
                  <input type="file" accept="image/*" style={{display:'none'}} onChange={async(e)=>{
                    const f = e.target.files?.[0];
                    if(!f) return;
                    const fd = new FormData();
                    fd.append('file', f);
                    try {
                      const r = await fetch('/api/uploads', { method:'POST', body: fd, headers: { Authorization: `Bearer ${localStorage.getItem('token')||''}` } });
                      const j = await r.json();
                      if(!r.ok) throw new Error(j?.error||'Falha no upload');
                      setForm(v=>({ ...v, logoUrl: j.url }));
                    } catch (err) {
                      alert(err.message||'Falha ao enviar');
                    } finally { e.target.value = ''; }
                  }}/>
                </label>
              </div>
              {!!form.logoUrl && (
                <div style={{marginTop:8}}>
                  <img src={form.logoUrl} alt="Pré-visualização do logo" style={{height:36}}/>
                </div>
              )}
            </div>
            {form.paymentProvider === 'mercadopago' && (
              <div>
                <label style={{display:'block', fontSize:13, color:'#6b7280'}}>Public Key (client)</label>
                <input placeholder="MP_PUBLIC_KEY (opcional para frontend)" value={form.mpPublicKey} onChange={e=>setForm({...form, mpPublicKey:e.target.value})} style={{width:'100%', padding:'10px 12px', border:'1px solid #e5e7eb', borderRadius:8}} />
              </div>
            )}

            <div>
              <label style={{display:'block', fontSize:13, color:'#6b7280'}}>Webhook URL</label>
              <input placeholder="https://seu-dominio.com/webhook" value={form.webhookUrl} onChange={e=>setForm({...form, webhookUrl:e.target.value})} style={{width:'100%', padding:'10px 12px', border:'1px solid #e5e7eb', borderRadius:8}} />
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
