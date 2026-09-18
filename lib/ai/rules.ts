export type BotResult={reply:string;intent:string;requiresHuman:boolean;action:null|string};
export type HistoryMessage={role:"user"|"bot";content:string};
const items=[{key:"pollo",name:"casado de pollo",price:"₡3.500"},{key:"carne",name:"casado de carne",price:"₡3.800"},{key:"arroz",name:"arroz con pollo",price:"₡3.200"}];
const result=(reply:string,intent:string,action:null|string=null,requiresHuman=false):BotResult=>({reply,intent,requiresHuman,action});

export function answerDemo(input:string,history:HistoryMessage[]=[]):BotResult{
  const q=input.trim().toLocaleLowerCase("es");
  const transcript=history.map(m=>m.content.toLocaleLowerCase("es")).join(" ");
  const lastBot=[...history].reverse().find(m=>m.role==="bot")?.content.toLocaleLowerCase("es")??"";
  const chosen=items.find(x=>transcript.includes(x.name)||transcript.includes(x.key));
  if(/humano|persona|encargado|queja/.test(q)) return result("Claro 👍 Le voy a comunicar con una persona del negocio.","human_request","handoff",true);
  if(/cancelar|empezar de nuevo|otro pedido/.test(q)) return result("De acuerdo. Empecemos de nuevo: ¿qué desea ordenar?","order","reset_order");
  if(lastBot.includes("¿cómo desea pagar")){
    if(/efectivo/.test(q))return finalOrder(history,chosen,"efectivo al retirar");
    if(/sinpe/.test(q))return finalOrder(history,chosen,"SINPE Móvil; el negocio le enviará el número para pagar");
    if(/tarjeta/.test(q))return finalOrder(history,chosen,"tarjeta al retirar");
    return result("Puede pagar en efectivo, por SINPE Móvil o con tarjeta al retirar. ¿Cuál prefiere?","order","collect_payment");
  }
  if(lastBot.includes("¿a nombre de quién")){
    const name=title(input.replace(/[,.-]/g," ").trim());
    return result(`Gracias, ${name}. Su pedido estará listo aproximadamente en 30 minutos. ¿Cómo desea pagar: efectivo, SINPE Móvil o tarjeta al retirar?`,"order","collect_payment");
  }
  if(/recoger|retiro|paso por/.test(q))return result("Perfecto. ¿A nombre de quién quedará el pedido?","order","collect_name");
  if(/entrega|domicilio|express/.test(q))return result("Con gusto. Para confirmar el envío necesito la ubicación y luego una persona del negocio validará el costo de entrega.","order","collect_address");
  if(/hola|buenas|buen día|buenas tardes/.test(q))return result("¡Hola! 👋 Hoy tenemos casado de pollo por ₡3.500, casado de carne por ₡3.800 y arroz con pollo por ₡3.200. ¿Qué le gustaría?","greeting");
  if(/horario|abren|cierran/.test(q))return result("Atendemos de lunes a sábado, de 10:00 a. m. a 8:00 p. m.","information");
  const current=items.find(x=>q.includes(x.name)||q.includes(x.key));
  if(current)return result(`${title(current.name)} cuesta ${current.price}. ¿Lo desea para recoger o entregar?`,"product_query","start_order");
  if(/menú|menu|tienen|precio|cuesta/.test(q))return result("Tenemos casado de pollo por ₡3.500, casado de carne por ₡3.800 y arroz con pollo por ₡3.200.","price_query");
  if(/gracias|listo|perfecto/.test(q))return result("¡Con mucho gusto! 😊 Si desea hacer otro pedido, escriba “otro pedido”.","information");
  return result("No tengo esa información confirmada. Voy a pasar su consulta a una persona del negocio.","unknown","handoff",true);
}
function title(value:string){return value.trim().replace(/\s+/g," ").replace(/^./,c=>c.toLocaleUpperCase("es"));}
function findName(history:HistoryMessage[]){
  const namePrompt=history.findIndex(m=>m.role==="bot"&&m.content.toLocaleLowerCase("es").includes("¿a nombre de quién"));
  return namePrompt>=0?title(history.slice(namePrompt+1).find(m=>m.role==="user")?.content??""):null;
}
function finalOrder(history:HistoryMessage[],chosen:typeof items[number]|undefined,payment:string){
  const name=findName(history)??"Cliente";const item=chosen??items[0];
  return result(`Pedido confirmado ✅ A nombre de ${name}: ${item.name}, total ${item.price}. Estará listo aproximadamente en 30 minutos. Forma de pago: ${payment}. ¡Muchas gracias!`,"order","complete_order");
}
