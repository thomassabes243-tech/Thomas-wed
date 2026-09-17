export async function sendWhatsAppText(phoneNumberId:string,to:string,body:string){
  const token=process.env.WHATSAPP_ACCESS_TOKEN; const version=process.env.WHATSAPP_API_VERSION??"v23.0";
  if(process.env.DEMO_MODE==="true")return {demo:true};
  if(!token)throw new Error("WHATSAPP_ACCESS_TOKEN no configurado");
  const response=await fetch(`https://graph.facebook.com/${version}/${phoneNumberId}/messages`,{method:"POST",headers:{authorization:`Bearer ${token}`,"content-type":"application/json"},body:JSON.stringify({messaging_product:"whatsapp",to,type:"text",text:{body}})});
  if(!response.ok)throw new Error(`Meta API respondió ${response.status}`);
  return response.json();
}
