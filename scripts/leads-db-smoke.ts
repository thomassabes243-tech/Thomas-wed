import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";
import { LeadRequest, leadSubmissionKey, isPublicLeadCaptureEnabled } from "../lib/marketing/leads";
import { POST } from "../app/api/leads/route";

const url = process.env.DATABASE_URL ?? "";
if (process.env.PORTAL_TEST_DB !== "true" ||
  !/^postgres(?:ql)?:\/\/[^@]+@(?:localhost|127\.0\.0\.1):5432\/metabot_portal_test(?:\?|$)/.test(url)) {
  throw new Error("Lead integration tests require a disposable local metabot_portal_test database.");
}
function makeRequest(body: unknown, origin = "http://localhost:3000"): NextRequest {
  return new NextRequest("http://localhost:3000/api/leads", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Origin": origin },
    body: JSON.stringify(body),
  });
}
async function main() {
  const db = new PrismaClient();
  const email = randomUUID().replaceAll("-", "") + "@example.invalid";
  const form = {
    name: "Persona QA", company: "Empresa sintética de prueba", email,
    phone: "", sector: "tienda", interest: "whatsapp",
    message: "Quiero conocer las funciones disponibles para atender consultas reales.",
    consent: true, website: "",
  };
  try {
    assert.equal(isPublicLeadCaptureEnabled({METABOT_LEAD_CAPTURE_ENABLED:"false",DATABASE_URL:url}), false);
    assert.equal(isPublicLeadCaptureEnabled({METABOT_LEAD_CAPTURE_ENABLED:"true",DATABASE_URL:url}), true);
    assert.equal(LeadRequest.safeParse(form).success, true);
    assert.equal(LeadRequest.safeParse({...form,consent:false}).success, false);
    assert.equal(LeadRequest.safeParse({...form,interest:"other"}).success, false);
    assert.equal(LeadRequest.safeParse({...form, businessId:"victim"}).success, false);
    assert.equal(leadSubmissionKey(email, new Date()), leadSubmissionKey(email.toUpperCase(), new Date()));

    process.env.METABOT_LEAD_CAPTURE_ENABLED = "true";
    assert.equal((await POST(makeRequest(form, "http://untrusted.example"))).status, 403);
    assert.equal((await POST(makeRequest({...form,consent:false}))).status, 400);
    assert.equal((await POST(makeRequest({...form,message:"tiny"}))).status, 400);
    assert.equal(await db.salesLead.count({ where:{email} }), 0);
    assert.equal((await POST(makeRequest({...form,website:"spam-site.example"}))).status, 202);
    assert.equal(await db.salesLead.count({ where:{email} }), 0);

    const response = await POST(makeRequest(form));
    assert.equal(response.status, 201);
    assert.equal((await response.json()).accepted, true);
    const stored = await db.salesLead.findFirst({where:{email}});
    assert.ok(stored);
    assert.equal(stored.company, form.company);
    assert.equal(stored.interest, form.interest);
    assert.equal(stored.status, "new");
    assert.ok(stored.consentedAt instanceof Date);

    const repeat = await POST(makeRequest(form));
    assert.equal(repeat.status, 200);
    assert.equal((await repeat.json()).accepted, true);
    assert.equal(await db.salesLead.count({where:{email}}), 1);
    console.log("PASS: lead input validation, origin, consent, honeypot, persistence, deduplication in disposable PostgreSQL.");
  } finally {
    await db.salesLead.deleteMany({where:{email}});
    await db.$disconnect();
  }
}
main().catch(err=>{ console.error(err); process.exitCode=1; });
