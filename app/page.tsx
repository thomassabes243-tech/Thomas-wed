import DemoChat from "@/components/demo-chat";

export default function Home() {
  return <main className="shell">
    <header className="top"><div className="brand">MetaBot <span>CR</span></div><a className="pill" href="#demo">Probar demo</a></header>
    <section className="hero">
      <div><div className="eyebrow">Atención automática para negocios</div><h1>No pierda clientes por responder tarde.</h1><p className="lead">MetaBot CR aprende la información de su negocio y responde consultas de WhatsApp, captura pedidos y detecta cuándo debe intervenir una persona.</p><div className="actions"><a className="pill" href="#demo">Ver demostración</a><a className="pill secondary" href="#panel">Explorar panel</a></div></div>
      <div className="notice">Modo demostración activo: no envía mensajes reales ni genera cargos de Meta o IA.</div>
    </section>
    <section className="section" id="panel"><h2>Todo bajo control desde el celular</h2><div className="grid">
      <div className="card"><div className="label">Conversaciones abiertas</div><div className="metric">12</div><span className="status">3 nuevas</span></div>
      <div className="card"><div className="label">Requieren una persona</div><div className="metric">2</div><span className="status">Atender ahora</span></div>
      <div className="card"><div className="label">Pedidos de hoy</div><div className="metric">8</div><span className="label">Datos de demostración</span></div>
    </div></section>
    <section className="section" id="demo"><h2>Simulador de WhatsApp</h2><div className="demo"><div className="card"><div className="eyebrow">Soda Demo</div><h3>Probá preguntas reales</h3><p className="label">El motor responde solo con estos datos:</p><div className="menu"><button>Casado de pollo — ₡3.500</button><button>Casado de carne — ₡3.800</button><button>Arroz con pollo — ₡3.200</button><button>Horario: lunes a sábado, 10 a. m.–8 p. m.</button></div></div><DemoChat /></div></section>
  </main>;
}
