"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
const DemoChat=dynamic(()=>import("./demo-chat"),{ssr:false,loading:()=> <p role="status">Cargando demostración…</p>});
export default function LazyDemo(){const [open,setOpen]=useState(false);return open?<DemoChat/>:<div className="demo-launch"><span className="bot-symbol">m</span><h3>Conversá con la demo</h3><p>Sin registro. Sin conectar tu número.</p><button className="button" onClick={()=>setOpen(true)}>Iniciar demostración ↗</button><small>Simulación por reglas, sin IA conectada ni pedidos reales.</small></div>}
