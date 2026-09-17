export type BotResult={reply:string;intent:string;requiresHuman:boolean;action:null|string};
const items=[{name:"casado de pollo",price:"₡3.500"},{name:"casado de carne",price:"₡3.800"},{name:"arroz con pollo",price:"₡3.200"}];
export function answerDemo(input:string):BotResult{
  const q=input.toLocaleLowerCase("es");
  if(/humano|persona|encargado|queja/.test(q)) return {reply:"Claro 👍 Le voy a comunicar con una persona del negocio.",intent:"human_request",requiresHuman:true,action:"handoff"};
  if(/hola|buenas|buen día|buenas tardes/.test(q)) return {reply:"¡Hola! 👋 Hoy tenemos casado de pollo por ₡3.500, casado de carne por ₡3.800 y arroz con pollo por ₡3.200. ¿Qué le gustaría?",intent:"greeting",requiresHuman:false,action:null};
  if(/horario|abren|cierran/.test(q)) return {reply:"Atendemos de lunes a sábado, de 10:00 a. m. a 8:00 p. m.",intent:"information",requiresHuman:false,action:null};
  const item=items.find(x=>q.includes(x.name)||q.includes(x.name.split(" de ").at(-1)!));
  if(item) return {reply:`${item.name[0].toUpperCase()+item.name.slice(1)} cuesta ${item.price}. ¿Lo desea para recoger o entregar?`,intent:"product_query",requiresHuman:false,action:"start_order"};
  if(/menú|menu|tienen|precio|cuesta/.test(q)) return {reply:"Tenemos casado de pollo por ₡3.500, casado de carne por ₡3.800 y arroz con pollo por ₡3.200.",intent:"price_query",requiresHuman:false,action:null};
  if(/recoger|entrega|pedido|ordenar/.test(q)) return {reply:"Perfecto. ¿A nombre de quién y aproximadamente a qué hora?",intent:"order",requiresHuman:false,action:"collect_order"};
  return {reply:"No tengo esa información disponible. Permítame comunicarlo con el negocio.",intent:"unknown",requiresHuman:true,action:"handoff"};
}
