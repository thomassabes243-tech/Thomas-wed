import { NextRequest, NextResponse } from "next/server";
import { isTrustedCatalogMutationOrigin } from "@/lib/catalog/request-origin";

const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function middleware(request: NextRequest) {
  if (!MUTATION_METHODS.has(request.method)) return NextResponse.next();

  // Prevent cross-site mutations on the legacy, cookie-authenticated catalog API.
  // Service clients must set an explicit Origin matching the public deployment URL.
  const expectedOrigin = request.nextUrl.origin;
  if (!isTrustedCatalogMutationOrigin(request.headers.get("origin"), expectedOrigin)) {
    return NextResponse.json(
      { error: "Origen de solicitud no autorizado." },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/api/catalog/:path*"],
};
