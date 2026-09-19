import { NextRequest, NextResponse } from "next/server";
import { clearCatalogAdminSession } from "@/lib/catalog/admin-session";

export async function POST(request: NextRequest) {
  await clearCatalogAdminSession();
  return NextResponse.redirect(new URL("/catalog/login", request.url), 303);
}
