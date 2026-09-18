"use client";
import { useState } from "react";

export default function LossCalculator() {
  const [daily,setDaily]=useState(10);
  const [missed,setMissed]=useState(20);
  const [recovered,setRecovered]=useState(15);
  const [margin,setMargin]=useState(10);
  const [cost,setCost]=useState(50);
  const [minutes,setMinutes]=useState(3);
  const [automated,setAutomated]=useState(30);
  const monthly=daily*30;
  const risk=monthly*missed/100;
  const sales=risk*recovered/100;
  const gross=sales*margin;
  const money=(v:number)=>new Intl.NumberFormat("es-CR",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(v);
  const number=(v:number)=>new Intl.NumberFormat("es-CR",{maximumFractionDigits:1}).format(v);
  const fields=[
    {label:"Consultas por día",value:daily,set:setDaily,min:0,max:1000,step:1},
    {label:"Consultas en riesgo por demora (%)",value:missed,set:setMissed,min:0,max:100,step:1},
    {label:"En riesgo que terminarían en venta con el bot (%)",value:recovered,set:setRecovered,min:0,max:100,step:1},
    {label:"Margen por venta adicional (USD)",value:margin,set:setMargin,min:0,max:100000,step:1},
    {label:"Costo mensual total estimado (USD)",value:cost,set:setCost,min:0,max:100000,step:1},
    {label:"Minutos dedicados a cada consulta",value:minutes,set:setMinutes,min:0,max:120,step:1},
    {label:"Consultas que el bot resolvería solo (%)",value:automated,set:setAutomated,min:0,max:100,step:1},
  ];
  return <div className="calculator">
    <div className="calc-inputs"><h3>Tu negocio, tus supuestos.</h3><p>Estos valores son un ejemplo editable, no estadísticas del mercado ni una cotización.</p>
      {fields.map((f,i)=><label key={f.label} htmlFor={`calc-${i}`}>{f.label}<input id={`calc-${i}`} type="number" min={f.min} max={f.max} step={f.step} value={f.value} onChange={e=>{const n=Number(e.target.value);f.set(Number.isFinite(n)?Math.min(f.max,Math.max(f.min,n)):0)}}/></label>)}
    </div>
    <div className="calc-results" aria-live="polite">
      <span className="eyebrow">ESCENARIO MENSUAL · 30 DÍAS</span>
      <h3>¿Qué pasa si {number(missed/10)} de cada 10 consultas se enfrían?</h3>
      <div className="people" aria-hidden="true">{Array.from({length:10},(_,i)=><span className={i<Math.ceil(missed/10)?"at-risk":""} key={i}>●</span>)}</div>
      <p>Con tus supuestos: <strong>{number(risk)} consultas al mes en riesgo</strong>. No significa que todas sean ventas perdidas.</p>
      <div className="calc-metrics"><div><small>Ventas adicionales estimadas</small><strong>{number(sales)}</strong></div><div><small>Horas brutas liberadas</small><strong>{number(monthly*minutes*automated/6000)} h</strong></div></div>
      <div className="result-money"><small>Margen recuperado antes del costo del bot</small><strong>{money(gross)}/mes</strong><div className="result-track"><span style={{width:`${Math.min(100,recovered)}%`}}/></div><p>Saldo después del costo mensual indicado: <b>{money(gross-cost)}</b>.</p></div>
      <p className="break-even">{margin>0?`Para cubrir ${money(cost)} al mes, necesitás ${Math.ceil(cost/margin)} ventas adicionales con ${money(margin)} de margen cada una.`:"Ingresá un margen mayor que cero para calcular cuántas ventas cubren el costo."}</p>
      <details><summary>Cómo calculamos este escenario</summary><p>Consultas en riesgo = consultas diarias × 30 × porcentaje en riesgo. Ventas adicionales = consultas en riesgo × conversión supuesta. Margen recuperado = ventas adicionales × margen por venta. Restamos el costo mensual que ingresaste.</p><p>Incluí mantenimiento, consumo de Meta e IA y la parte mensual de instalación en el costo. El margen por venta debe descontar los costos de vender. El tiempo no descuenta supervisión ni excepciones. Las fracciones son promedios estadísticos, no pedidos reales.</p></details>
      <small>Simulación, no predicción. No conocemos tu tasa de pérdida ni podemos garantizar ventas. Cambiá los supuestos y compará con tus resultados reales.</small>
    </div>
  </div>;
}
