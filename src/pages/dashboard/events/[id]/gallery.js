import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import DashboardLayout from '../../../../components/dashboard/DashboardLayout';
import api from '../../../../lib/api';

export default function GalleryPage(){
  const router = useRouter();
  const { id } = router.query;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(()=>{
    if(!id) return;
    api.get(`/events/${id}/gallery`).then(r=>setItems(r.data)).catch(()=>setItems([])).finally(()=>setLoading(false));
  },[id]);

  async function removeItem(imgId){
    if(!confirm('Remover imagem?')) return;
    setBusy(true);
    try{
      await api.delete(`/events/${id}/gallery/${imgId}`);
      setItems(list=>list.filter(i=>i._id!==imgId));
    }finally{ setBusy(false); }
  }

  async function onFileChange(e){
    const files = Array.from(e.target.files||[]);
    if(files.length===0) return;
    // show temporary previews
    const tmpKey = `tmp-${Date.now()}`;
    const previews = files.map((f,idx)=>({ _id:`${tmpKey}-${idx}`, url: URL.createObjectURL(f), caption:'' }));
    setItems(list=>[...previews, ...list]);

    const fd = new FormData();
    files.forEach(f=> fd.append('files', f));
    setBusy(true); setProgress(0);
    try{
      const r = await api.post(`/events/${id}/gallery`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (ev)=>{
          if(!ev.total) return;
          setProgress(Math.round((ev.loaded/ev.total)*100));
        }
      });
      // replace previews with server items
      setItems(list=>{
        const withoutTmp = list.filter(i=>!String(i._id).startsWith(tmpKey));
        return [...r.data, ...withoutTmp];
      });
    }catch(err){
      alert(err?.response?.data?.error || 'Falha ao enviar imagens');
      // remove previews on error
      setItems(list=>list.filter(i=>!String(i._id).startsWith(tmpKey)));
    }finally{ setBusy(false); setProgress(0); e.target.value=''; }
  }

  return (
    <DashboardLayout title="Galeria do Evento">
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12}}>
        <div>Gerencie as fotos exibidas na página do evento.</div>
        <label style={{background:'#111827', color:'#fff', padding:'8px 12px', borderRadius:8, cursor:'pointer'}}>
          + Adicionar imagens
          <input type="file" accept="image/*" multiple style={{display:'none'}} onChange={onFileChange} />
        </label>
      </div>

      {loading ? (
        <div>Carregando...</div>
      ) : items.length === 0 ? (
        <div>Nenhuma imagem ainda.</div>
      ) : (
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(160px,1fr))', gap:12}}>
          {items.map(img=> (
            <div key={img._id} style={{background:'#fff', border:'1px solid #e5e7eb', borderRadius:8, padding:8}}>
              <img src={img.url} alt={img.caption||''} style={{width:'100%', height:120, objectFit:'cover', borderRadius:6}} />
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:8}}>
                <input placeholder="Legenda" defaultValue={img.caption||''} style={{flex:1, marginRight:8}} />
                <button disabled={busy} onClick={()=>removeItem(img._id)}>Remover</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {busy && (
        <div style={{marginTop:12, fontSize:12, color:'#6b7280'}}>Enviando... {progress}%</div>
      )}
    </DashboardLayout>
  );
}
