import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { isTrustedCatalogMutationOrigin } from "@/lib/catalog/request-origin";
import {
  LeadRequest,
  leadSubmissionKey,
  isPublicLeadCaptureEnabled,
} from "@/lib/marketing/leads";

// Never claim receipt unless the lead has been persisted successfully.
// No email sending, WhatsApp messaging or payment is performed.
export async function POST(request: NextRequest) {
  if (!isPublicLeadCaptureEnabled()) {
    return NextResponse.json(
      { error: "Las solicitudes aún no están habilitadas." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (!isTrustedCatalogMutationOrigin(
    request.headers.get("origin"), request.nextUrl.origin,
  )) {
    return NextResponse.json({ error: "Origen no autorizado." }, { status: 403 });
  }
  if (!(request.headers.get("content-type") ?? "").startsWith("application/json")) {
    return NextResponse.json({ error: "Formato de solicitud inválido." }, { status: 415 });
  }
  const body = await request.text();
  if (body.length > 8192) {
    return NextResponse.json({ error: "La solicitud es demasiado grande." }, { status: 413 });
  }

  let json: unknown;
  try { json = JSON.parse(body); } catch {
    return NextResponse.json({ error: "Los datos no tienen un formato válido." }, { status: 400 });
  }
  const checked = LeadRequest.safeParse(json);
  if (!checked.success) {
    return NextResponse.json({
      error: "Revisá los campos obligatorios y autorizá el contacto.",
    }, { status: 400 });
  }
  const { website, consent: _consent, ...input } = checked.data;
  // Honeypot: quietly accept but do not store automated submissions.
  if (website) return NextResponse.json({ accepted: true }, { status: 202 });

  const now = new Date();
  try {
    const lastDay = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const recentCount = await db.salesLead.count({
      where: { email: input.email, createdAt: { gte: lastDay } },
    });
    if (recentCount >= 2) {
      return NextResponse.json(
        { error: "Ya recibimos solicitudes recientes de este correo. Podés comunicarte nuevamente más adelante." },
        { status: 429, headers: { "Cache-Control": "no-store" } },
      );
    }
    await db.salesLead.create({
      data: {
        ...input,
        phone: input.phone || null,
        consentedAt: now,
        submissionKey: leadSubmissionKey(input.email, now),
      },
    });
    return NextResponse.json(
      { accepted: true, message: "Solicitud registrada correctamente." },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    // Race-safe deduplication, with a daily unique submission key.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({
        accepted: true, message: "Ya habíamos registrado esta solicitud.",
      }, { status: 200, headers: { "Cache-Control": "no-store" } });
    }
    console.error("Lead capture persistence error:", error instanceof Error ? error.name : "unknown");
    return NextResponse.json(
      { error: "No fue posible registrar la solicitud. Intentá de nuevo." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
