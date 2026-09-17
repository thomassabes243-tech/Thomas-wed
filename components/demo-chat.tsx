"use client";
import { FormEvent, useState } from "react";

type ChatMessage={role:"user"|"bot";content:string};
const initial:ChatMessage[]=[{role:"bot",content:"¡Hola! 👋 Soy el asistente de Soda Demo. ¿Qué desea consultar?"}];

export default function DemoChat(){
  const [messages,setMessages]=useState(initial); const [text,setText]=useState(""); const [busy,setBusy]=useState(false);
  async function send(e:FormEvent){e.preventDefault(); const value=text.trim(); if(!value||busy)return; setMessages(m=>[...m,{role:"user",content:value}]);setText("");setBusy(true);
    try{const res=await fetch("/api/demo/chat",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({message:value})});const data=await res.json();setMessages(m=>[...m,{role:"bot",content:data.reply}]);}finally{setBusy(false)}
  }
  return <div className="phone"><div className="chathead">Soda Demo · en línea</div><div className="messages">{messages.map((m,i)=><div key={i} className={`msg ${m.role}`}>{m.content}</div>)}</div><form className="composer" onSubmit={send}><input aria-label="Mensaje" value={text} onChange={e=>setText(e.target.value)} placeholder="Escriba horario, menú o precio…"/><button aria-label="Enviar">➤</button></form></div>
}
