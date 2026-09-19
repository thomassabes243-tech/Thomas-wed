import { NextRequest, NextResponse } from "next/server";
import {
  createCatalogAdminSession,
  verifyCatalogAdminPassword,
} from "@/lib/catalog/admin-session";

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const password = String(form.get("password") ?? "");

  if (!password || !verifyCatalogAdminPassword(password)) {
    return NextResponse.redirect(new URL("/catalog/login?error=1", request.url), 303);
  }

  await createCatalogAdminSession();
  return NextResponse.redirect(new URL("/catalog", request.url), 303);
}
