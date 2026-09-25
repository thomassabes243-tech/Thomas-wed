import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { assertCatalogAdmin } from "@/lib/catalog/security";

function templateFor(type: string) {
  const normalized = type.toLowerCase();

  if (/farmacia|pharmacy/.test(normalized)) {
    return {
      tone: "amable, claro y breve",
      welcomeMessage: "Hola. Soy el asistente de la farmacia. Puedo ayudarte con productos, precios, horarios, ubicación y disponibilidad registrada.",
      fallbackMessage: "No tengo esa información confirmada. Puedo pasar tu consulta al personal de la farmacia.",
      humanHandoffMessage: "Esta consulta necesita atención del personal de la farmacia. Ya la dejé marcada para que una persona la revise.",
      systemInstructions:
        "Respondé solo con información registrada del negocio y su catálogo. Podés informar productos, presentación, precio registrado, existencia registrada, horario, ubicación y servicios. No des diagnósticos, dosis, tratamientos, sustituciones, interacciones, contraindicaciones ni recomendaciones clínicas. Esas consultas deben pasar a un farmacéutico o responsable humano.",
    };
  }

  if (/hotel|hostal|hospedaje|cabina|lodge/.test(normalized)) {
    return {
      tone: "amable, hospitalario y breve",
      welcomeMessage: "Hola. Soy el asistente del hospedaje. Puedo ayudarte con habitaciones, precios registrados, servicios, ubicación y horarios.",
      fallbackMessage: "No tengo ese dato confirmado. Puedo pasar tu consulta a recepción.",
      humanHandoffMessage: "La disponibilidad final debe confirmarla recepción. Ya marqué tu consulta para atención humana.",
      systemInstructions:
        "Usá únicamente información registrada. Podés explicar habitaciones, precios, amenidades, check-in, check-out, ubicación y políticas. No confirmes disponibilidad en tiempo real si no existe una fuente de disponibilidad conectada; pedí fechas y cantidad de huéspedes y derivá a recepción cuando haga falta.",
    };
  }

  if (/tour|turismo|excursion|operador/.test(normalized)) {
    return {
      tone: "amable, claro y orientado a reservas",
      welcomeMessage: "Hola. Soy el asistente de tours. Puedo ayudarte con actividades, precios registrados, duración, ubicación y qué incluye cada opción.",
      fallbackMessage: "No tengo ese dato confirmado. Puedo pasar tu consulta al equipo.",
      humanHandoffMessage: "El cupo final debe confirmarlo el equipo. Ya marqué tu consulta para atención humana.",
      systemInstructions:
        "Respondé solo con datos registrados sobre tours, precios, duración, ubicación, capacidad e inclusiones. No confirmes cupos en tiempo real si no existe disponibilidad conectada. Para fechas específicas pedí fecha y cantidad de personas y derivá al equipo.",
    };
  }

  if (/salon|salón|belleza|barber/.test(normalized)) {
    return {
      tone: "amable, breve y profesional",
      welcomeMessage: "Hola. Soy el asistente del negocio. Puedo ayudarte con servicios, precios registrados, horarios y ubicación.",
      fallbackMessage: "No tengo ese dato confirmado. Puedo pasar tu consulta al equipo.",
      humanHandoffMessage: "Voy a pasar tu consulta a una persona del negocio.",
      systemInstructions:
        "Respondé solo con servicios, precios, horarios y datos registrados. Para disponibilidad de citas en fechas u horas específicas, derivá a una persona salvo que exista una agenda conectada.",
    };
  }

  if (/taller|mecanica|mecánica|automotriz/.test(normalized)) {
    return {
      tone: "claro, profesional y breve",
      welcomeMessage: "Hola. Soy el asistente del taller. Puedo ayudarte con servicios, precios registrados, horarios y ubicación.",
      fallbackMessage: "No tengo ese dato confirmado. Puedo pasar tu consulta al taller.",
      humanHandoffMessage: "Esta consulta necesita revisión del taller. Ya la marqué para atención humana.",
      systemInstructions:
        "Respondé solo con servicios y datos registrados. No diagnostiques fallas mecánicas a distancia ni confirmes reparaciones o precios no registrados. Cuando haga falta inspección, derivá a una persona del taller.",
    };
  }

  return {
    tone: "amable y breve",
    welcomeMessage: "Hola. Soy el asistente del negocio. ¿En qué puedo ayudarte?",
    fallbackMessage: "No tengo esa información confirmada. Puedo pasar tu consulta a una persona del negocio.",
    humanHandoffMessage: "Voy a pasar tu consulta a una persona del negocio.",
    systemInstructions:
      "Respondé únicamente con información registrada del negocio y su catálogo. No inventes precios, horarios, disponibilidad ni condiciones. Cuando una consulta requiera confirmación humana, derivala al negocio.",
  };
}

export async function GET() {
  try {
    await assertCatalogAdmin();
    const businesses = await db.business.findMany({
      where: { status: "active" },
      select: {
        id: true,
        name: true,
        country: true,
        type: true,
        phoneNumber: true,
        address: true,
        whatsappConnectionStatus: true,
        botConfig: { select: { active: true } },
        _count: { select: { products: true, conversations: true } },
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({
      businesses: businesses.map((business) => ({
        id: business.id,
        name: business.name,
        country: business.country,
        type: business.type,
        phoneNumber: business.phoneNumber,
        address: business.address,
        whatsappConnectionStatus: business.whatsappConnectionStatus,
        botActive: business.botConfig?.active ?? true,
        productCount: business._count.products,
        conversationCount: business._count.conversations,
        createdAt: business.createdAt,
      })),
    });
  } catch (error) {
    const status = (error as Error & { status?: number }).status ?? 400;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudieron cargar las empresas." },
      { status },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await assertCatalogAdmin();

    const body = (await request.json()) as {
      name?: string;
      type?: string;
      country?: string;
      phoneNumber?: string;
      address?: string;
      description?: string;
    };

    const name = body.name?.trim() ?? "";
    const type = body.type?.trim() ?? "";
    if (!name || !type) {
      return NextResponse.json(
        { error: "Nombre de empresa y tipo de negocio son requeridos." },
        { status: 400 },
      );
    }

    const template = templateFor(type);

    const business = await db.$transaction(async (tx) => {
      const created = await tx.business.create({
        data: {
          name,
          type,
          country: body.country?.trim() || "Costa Rica",
          phoneNumber: body.phoneNumber?.trim() || null,
          address: body.address?.trim() || null,
          description: body.description?.trim() || null,
          status: "active",
        },
      });

      await tx.botConfig.create({
        data: {
          businessId: created.id,
          tone: template.tone,
          welcomeMessage: template.welcomeMessage,
          fallbackMessage: template.fallbackMessage,
          humanHandoffMessage: template.humanHandoffMessage,
          systemInstructions: template.systemInstructions,
          active: true,
        },
      });

      return created;
    });

    return NextResponse.json({ business }, { status: 201 });
  } catch (error) {
    const status = (error as Error & { status?: number }).status ?? 400;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo crear la empresa." },
      { status },
    );
  }
}
