
export default function Sobre(){
  return (
    <div>
      <div style={{maxWidth:1000, margin:'24px auto', padding:'0 16px'}}>
        <h1 style={{marginTop:8}}>Sobre nós</h1>
        <p style={{color:'#374151'}}>Somos uma plataforma de ingressos focada em segurança, praticidade e uma ótima experiência para quem organiza e para quem participa de eventos.</p>

        <section style={{marginTop:16, background:'#fff', border:'1px solid #e5e7eb', borderRadius:12, padding:16}}>
          <h2 style={{marginTop:0}}>Nossa missão</h2>
          <p>Facilitar a criação, venda e validação de ingressos, com QR Code seguro, compartilhamento simples e entrega automática por e‑mail.</p>
        </section>

        <section style={{marginTop:16, background:'#fff', border:'1px solid #e5e7eb', borderRadius:12, padding:16}}>
          <h2 style={{marginTop:0}}>O que oferecemos</h2>
          <ul>
            <li>Emissão de ingressos com QR Code e PDF</li>
            <li>Envio por e‑mail e painel do cliente</li>
            <li>Validação via câmera no celular</li>
            <li>Galeria de fotos por evento</li>
          </ul>
        </section>

        <section style={{marginTop:16, background:'#fff', border:'1px solid #e5e7eb', borderRadius:12, padding:16}}>
          <h2 style={{marginTop:0}}>Fale com a gente</h2>
          <p>Tem dúvidas, sugestões ou quer parceria? Acesse nossa página de contato.</p>
          <a href="/contato" style={{display:'inline-block', marginTop:8, background:'#111827', color:'#fff', borderRadius:8, padding:'10px 14px', textDecoration:'none'}}>Ir para Contato</a>
        </section>
      </div>
    </div>
  );
}
