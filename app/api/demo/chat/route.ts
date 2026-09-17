import { NextResponse } from "next/server";
import { z } from "zod";
import { answerDemo } from "@/lib/ai/rules";
const Body=z.object({message:z.string().trim().min(1).max(500)});
export async function POST(request:Request){
  const parsed=Body.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return NextResponse.json({error:"Mensaje inválido"},{status:400});
  return NextResponse.json(answerDemo(parsed.data.message));
}
