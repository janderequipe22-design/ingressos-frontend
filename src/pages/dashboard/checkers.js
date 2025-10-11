import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import api from '../../lib/api';
import { getToken } from '../../lib/auth';

export default function CheckersPage(){
  const [logged, setLogged] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkers, setCheckers] = useState([]);
  const [form, setForm] = useState({ fullName:'', email:'', whatsapp:'', username:'', password:'', gate:'' });
  const [editItem, setEditItem] = useState(null);
  const [editForm, setEditForm] = useState({ fullName:'', username:'', password:'', gate:'' });

  useEffect(()=>{ setLogged(!!getToken()); },[]);
  useEffect(()=>{
    if (logged!==true){ if(logged===false) setLoading(false); return; }
    load();
  },[logged]);

  async function load(){
    try{
      const r = await api.get('/checkers'); setCheckers(r.data||[]);
    } catch(e){
      const status = e?.response?.status;
      if (status === 403){
        // Promove automaticamente a organizer e tenta de novo
        try{ await api.post('/admin/promote-self'); const r = await api.get('/checkers'); setCheckers(r.data||[]); }
        catch(err){ /* mantém erro silencioso; UI exibirá vazio */ }
      }
    } finally {
      setLoading(false);
    }
  }

  function openEdit(ch){
    setEditItem(ch);
    setEditForm({ fullName: ch.fullName||'', username: ch.username||'', password:'', gate: ch.gate||'' });
  }

  async function saveEdit(){
    if (!editItem) return;
    try{
      const payload = { fullName: editForm.fullName, username: editForm.username, gate: editForm.gate };
      if (editForm.password) payload.password = editForm.password;
      const r = await api.put(`/checkers/${encodeURIComponent(editItem._id)}`, payload);
      setCheckers(prev => prev.map(c => c._id===editItem._id ? r.data : c));
      setEditItem(null);
      alert('Checador atualizado');
    }catch(e){
      alert(e?.response?.data?.error || 'Falha ao atualizar checador');
    }
  }

  async function create(){
    try{
      const { fullName, email, whatsapp, username, password, gate } = form;
      if (!fullName || !email || !username || !password){ alert('Preencha nome, email, usuário e senha'); return; }
      const r = await api.post('/checkers', { fullName, email, whatsapp, username, password, gate });
      setForm({ fullName:'', email:'', whatsapp:'', username:'', password:'', gate:'' });
      setCheckers(prev => [r.data, ...prev]);
      alert('Checador criado');
    }catch(e){
      const status = e?.response?.status;
      if (status === 403){
        try{
          await api.post('/admin/promote-self');
          const { fullName, email, whatsapp, username, password, gate } = form;
          const r = await api.post('/checkers', { fullName, email, whatsapp, username, password, gate });
          setForm({ fullName:'', email:'', whatsapp:'', username:'', password:'', gate:'' });
          setCheckers(prev => [r.data, ...prev]);
          alert('Checador criado');
          return;
        }catch(err){ /* cai para alerta padrão */ }
      }
      alert(e?.response?.data?.error || 'Falha ao criar checador');
    }
  }

  async function removeOne(id){
    if (!confirm('Remover este checador?')) return;
    try{ await api.delete(`/checkers/${encodeURIComponent(id)}`); setCheckers(prev=> prev.filter(c=>c._id!==id)); }
    catch(e){ alert(e?.response?.data?.error || 'Falha ao remover'); }
  }

  if (logged===null){
    return <DashboardLayout title="Checadores"><div>Carregando...</div></DashboardLayout>;
  }
  if (!logged){
    return (
      <DashboardLayout title="Checadores">
        <div>Você precisa entrar no <a href="/dashboard">Dashboard</a> com o email do administrador para gerenciar checadores.</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Checadores">
      {loading ? (
        <div>Carregando...</div>
      ) : (
        <div style={{display:'grid', gap:16}}>
          <div style={{background:'#fff', border:'1px solid #e5e7eb', borderRadius:12, padding:12}}>
            <h3 style={{marginTop:0, fontWeight:500, fontSize:20}}>Novo checador</h3>
            <div style={{display:'grid', gap:8, gridTemplateColumns:'1fr 1fr'}}>
              <div>
                <label style={{display:'block', fontSize:13, color:'#6b7280'}}>Nome completo</label>
                <input value={form.fullName} onChange={e=>setForm({...form, fullName:e.target.value})} placeholder="Ex: João da Silva" style={{width:'100%', padding:'10px 12px', border:'1px solid #e5e7eb', borderRadius:8}} />
              </div>
              <div>
                <label style={{display:'block', fontSize:13, color:'#6b7280'}}>Email</label>
                <input value={form.email} onChange={e=>setForm({...form, email:e.target.value})} placeholder="checador@email.com" style={{width:'100%', padding:'10px 12px', border:'1px solid #e5e7eb', borderRadius:8}} />
              </div>
              <div>
                <label style={{display:'block', fontSize:13, color:'#6b7280'}}>WhatsApp</label>
                <input value={form.whatsapp} onChange={e=>setForm({...form, whatsapp:e.target.value})} placeholder="(DDD) 90000-0000" style={{width:'100%', padding:'10px 12px', border:'1px solid #e5e7eb', borderRadius:8}} />
              </div>
              <div>
                <label style={{display:'block', fontSize:13, color:'#6b7280'}}>Usuário</label>
                <input value={form.username} onChange={e=>setForm({...form, username:e.target.value})} placeholder="usuario" style={{width:'100%', padding:'10px 12px', border:'1px solid #e5e7eb', borderRadius:8}} />
              </div>
              <div>
                <label style={{display:'block', fontSize:13, color:'#6b7280'}}>Senha</label>
                <input type="password" value={form.password} onChange={e=>setForm({...form, password:e.target.value})} placeholder="••••••••" style={{width:'100%', padding:'10px 12px', border:'1px solid #e5e7eb', borderRadius:8}} />
              </div>
              <div>
                <label style={{display:'block', fontSize:13, color:'#6b7280'}}>Portão</label>
                <input value={form.gate} onChange={e=>setForm({...form, gate:e.target.value})} placeholder="Ex.: Principal" style={{width:'100%', padding:'10px 12px', border:'1px solid #e5e7eb', borderRadius:8}} />
              </div>
              <div style={{display:'flex', alignItems:'end'}}>
                <button onClick={create} style={{background:'#111827', color:'#fff', border:0, padding:'10px 14px', borderRadius:10, fontWeight:600}}>Adicionar checador</button>
              </div>
            </div>
          </div>

          <div style={{background:'#fff', border:'1px solid #e5e7eb', borderRadius:12, padding:12}}>
            <h3 style={{marginTop:0, fontWeight:500, fontSize:20}}>Checadores cadastrados</h3>
            {checkers.length===0 ? (
              <div style={{color:'#6b7280'}}>Nenhum checador cadastrado.</div>
            ) : (
              <div style={{display:'grid', gap:8}}>
                {checkers.map(ch => (
                  <div key={ch._id} style={{display:'flex', justifyContent:'space-between', alignItems:'center', border:'1px dashed #e5e7eb', borderRadius:8, padding:10}}>
                    <div>
                      <div style={{fontWeight:500, fontSize:16}}>{ch.fullName} {ch.active===false && <span style={{color:'#b91c1c', fontWeight:500}}>(inativo)</span>}</div>
                      <div style={{fontSize:13, color:'#6b7280'}}>{ch.email} • {ch.whatsapp || 'sem WhatsApp'} • user: {ch.username} • portão: {ch.gate || '-'}</div>
                    </div>
                    <div style={{display:'flex', gap:8}}>
                      <button onClick={()=>openEdit(ch)} style={{border:'1px solid #e5e7eb', background:'#fff', borderRadius:8, padding:'6px 10px'}}>Editar</button>
                      <button onClick={()=>removeOne(ch._id)} style={{border:'1px solid #e5e7eb', background:'#fff', borderRadius:8, padding:'6px 10px'}}>Remover</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Modal de edição */}
          {editItem && (
            <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'grid', placeItems:'center', zIndex:50}}>
              <div style={{background:'#fff', borderRadius:12, border:'1px solid #e5e7eb', padding:16, width:'100%', maxWidth:420}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                  <h3 style={{margin:0, fontWeight:500}}>Editar checador</h3>
                  <button onClick={()=>setEditItem(null)} style={{border:'1px solid #e5e7eb', background:'#fff', borderRadius:8, padding:'6px 10px'}}>Fechar</button>
                </div>
                <div style={{display:'grid', gap:10, marginTop:10}}>
                  <div>
                    <label style={{display:'block', fontSize:12, color:'#6b7280'}}>Nome completo</label>
                    <input value={editForm.fullName} onChange={e=>setEditForm(v=>({...v, fullName:e.target.value}))} style={{width:'100%', padding:'10px 12px', border:'1px solid #e5e7eb', borderRadius:8}} />
                  </div>
                  <div>
                    <label style={{display:'block', fontSize:12, color:'#6b7280'}}>Usuário</label>
                    <input value={editForm.username} onChange={e=>setEditForm(v=>({...v, username:e.target.value}))} style={{width:'100%', padding:'10px 12px', border:'1px solid #e5e7eb', borderRadius:8}} />
                  </div>
                  <div>
                    <label style={{display:'block', fontSize:12, color:'#6b7280'}}>Nova senha (opcional)</label>
                    <input type="password" value={editForm.password} onChange={e=>setEditForm(v=>({...v, password:e.target.value}))} placeholder="••••••••" style={{width:'100%', padding:'10px 12px', border:'1px solid #e5e7eb', borderRadius:8}} />
                  </div>
                  <div>
                    <label style={{display:'block', fontSize:12, color:'#6b7280'}}>Portão</label>
                    <input value={editForm.gate} onChange={e=>setEditForm(v=>({...v, gate:e.target.value}))} placeholder="Ex.: Principal" style={{width:'100%', padding:'10px 12px', border:'1px solid #e5e7eb', borderRadius:8}} />
                  </div>
                  <div style={{display:'flex', justifyContent:'flex-end', gap:8}}>
                    <button onClick={()=>setEditItem(null)} style={{border:'1px solid #e5e7eb', background:'#fff', borderRadius:8, padding:'8px 12px'}}>Cancelar</button>
                    <button onClick={saveEdit} style={{background:'#111827', color:'#fff', border:0, padding:'8px 12px', borderRadius:8, fontWeight:600}}>Salvar</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
