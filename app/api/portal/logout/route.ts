import { NextRequest, NextResponse } from "next/server";
import { clearPortalSession } from "@/lib/portal/auth";

export async function POST(request: NextRequest) {
  await clearPortalSession();
  return NextResponse.redirect(new URL("/portal/login", request.url), 303);
}
