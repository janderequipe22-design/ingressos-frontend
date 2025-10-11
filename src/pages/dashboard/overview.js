import DashboardLayout from '../../components/dashboard/DashboardLayout';
import { useEffect, useState } from 'react';
import api from '../../lib/api';

export default function Overview() {
  const [kpi, setKpi] = useState(null);
  useEffect(() => {
    // Placeholder: try backend summary if exists
    api.get('/reports/sales/summary').then(r=>setKpi(r.data)).catch(()=>{
      setKpi({
        revenueToday: 0,
        revenue7d: 0,
        ticketsSold: 0,
        conversion: 0,
      });
    });
  }, []);
  return (
    <DashboardLayout title="Visão Geral">
      <div style={{display:'grid', gridTemplateColumns:'repeat(4, minmax(0,1fr))', gap:12}}>
        <KpiCard label="Receita hoje" value={`R$ ${(kpi?.revenueToday||0).toFixed(2)}`} />
        <KpiCard label="Receita (7d)" value={`R$ ${(kpi?.revenue7d||0).toFixed(2)}`} />
        <KpiCard label="Ingressos vendidos" value={kpi?.ticketsSold||0} />
        <KpiCard label="Conversão" value={`${(kpi?.conversion||0).toFixed(1)}%`} />
      </div>
    </DashboardLayout>
  );
}

function KpiCard({ label, value }){
  return (
    <div style={{background:'#fff', border:'1px solid #e5e7eb', borderRadius:10, padding:16}}>
      <div style={{fontSize:12, color:'#6b7280'}}>{label}</div>
      <div style={{fontSize:22, fontWeight:800, marginTop:6}}>{value}</div>
    </div>
  );
}
