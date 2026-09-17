import { NextRequest,NextResponse } from "next/server";
import { isValidMetaSignature } from "@/lib/meta/signature";

export async function GET(request:NextRequest){
  const q=request.nextUrl.searchParams;
  if(q.get("hub.mode")==="subscribe"&&q.get("hub.verify_token")===process.env.WHATSAPP_VERIFY_TOKEN){
    return new NextResponse(q.get("hub.challenge")??"",{status:200});
  }
  return NextResponse.json({error:"Verificación rechazada"},{status:403});
}

export async function POST(request:NextRequest){
  const raw=await request.text();
  if(!isValidMetaSignature(raw,request.headers.get("x-hub-signature-256")))return NextResponse.json({error:"Firma inválida"},{status:401});
  let event:unknown; try{event=JSON.parse(raw)}catch{return NextResponse.json({error:"JSON inválido"},{status:400})}
  // El procesamiento persistente se habilita después de conectar DATABASE_URL y aplicar Prisma.
  // Meta requiere responder pronto; los reintentos se deduplican por whatsappMessageId/WebhookEvent.
  return NextResponse.json({received:true,eventType:typeof event});
}
