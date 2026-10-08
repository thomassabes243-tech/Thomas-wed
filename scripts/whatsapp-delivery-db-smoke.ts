import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { db } from "../lib/db";
import { encryptCredential } from "../lib/meta/credentials";
import { handleWhatsAppInbound } from "../lib/bot/whatsapp-delivery";

const database = process.env.DATABASE_URL ?? "";
if (process.env.PORTAL_TEST_DB !== "true" ||
  !/^postgres(?:ql)?:\/\/[^@]+@(?:localhost|127\.0\.0\.1):5432\/metabot_portal_test(?:\?|$)/.test(database)) {
  throw new Error("WhatsApp delivery tests only run against disposable localhost/metabot_portal_test.");
}
process.env.WHATSAPP_CREDENTIALS_KEY = "test-only-credential-secret-never-used-in-production";
const suffix = randomUUID().replaceAll("-", "");
const firstBusiness = "wa-biz-" + suffix;
const secondBusiness = "wa-other-" + suffix;
const senderNumber = "+50685550000";
const eventId = (name: string) => "wamid.test." + suffix + "." + name;
const input = (name: string) => ({
  messageId: eventId(name), businessId: firstBusiness,
  from: senderNumber, customerName: "Test Person",
  text: "¿Qué horario tienen?",
});
let outboundCount = 0;
const fakeSender = async (_phone: string, _to: string, _text: string, _token: string) => {
  outboundCount++;
  return { messages: [{ id: "wamid.outbound." + suffix + "." + outboundCount }] };
};

async function main() {
  await db.business.createMany({
    data: [
      {
        id: firstBusiness, name: "Test Business",
        whatsappPhoneNumberId: "preview-" + suffix,
        whatsappAccessTokenEncrypted: encryptCredential("local-test-token"),
      },
      { id: secondBusiness, name: "Other Business" },
    ],
  });

  try {
    // One signed event results in one inbound row and one confirmed outbound row.
    assert.equal(await handleWhatsAppInbound(input("accepted"), fakeSender), "processed");
    assert.equal(await handleWhatsAppInbound(input("accepted"), fakeSender), "duplicate");
    assert.equal(outboundCount, 1);
    const accepted = await db.webhookEvent.findUnique({
      where: { eventId: eventId("accepted") },
    });
    assert.equal(accepted?.deliveryState, "sent");
    assert.equal(accepted?.status, "processed");
    assert.equal(accepted?.outboundMessageId, "wamid.outbound." + suffix + ".1");
    assert.equal(await db.message.count({
      where: { whatsappMessageId: { in: [eventId("accepted"), accepted!.outboundMessageId!] } },
    }), 2);
    // A message ID is not transferable to a different tenant or sender.
    assert.equal(
      await handleWhatsAppInbound({ ...input("accepted"), businessId: secondBusiness }, fakeSender),
      "needs_review",
    );
    assert.equal(outboundCount, 1);

    // A Meta/network failure AFTER reservation is always ambiguous: no retry.
    let networkAttempts = 0;
    const failing = async () => {
      networkAttempts++;
      throw new Error("network timeout after submitting to Meta");
    };
    assert.equal(await handleWhatsAppInbound(input("uncertain"), failing), "needs_review");
    assert.equal(await handleWhatsAppInbound(input("uncertain"), fakeSender), "needs_review");
    assert.equal(networkAttempts, 1);
    assert.equal(outboundCount, 1);
    const uncertain = await db.webhookEvent.findUnique({
      where: { eventId: eventId("uncertain") },
    });
    assert.equal(uncertain?.deliveryState, "uncertain");
    assert.equal(await db.message.count({
      where: { whatsappMessageId: eventId("uncertain") },
    }), 1);

    // If no credentials are configured the inbox is preserved, no send is attempted.
    await db.business.update({
      where: { id: firstBusiness },
      data: { whatsappAccessTokenEncrypted: null },
    });
    assert.equal(await handleWhatsAppInbound(input("retry-before-send"), fakeSender), "retryable");
    assert.equal(outboundCount, 1);
    const pending = await db.webhookEvent.findUnique({
      where: { eventId: eventId("retry-before-send") },
    });
    assert.equal(pending?.deliveryState, "ready");
    await db.business.update({
      where: { id: firstBusiness },
      data: { whatsappAccessTokenEncrypted: encryptCredential("local-test-token") },
    });
    assert.equal(await handleWhatsAppInbound(input("retry-before-send"), fakeSender), "processed");
    assert.equal(outboundCount, 2);
    assert.equal(await db.message.count({
      where: { whatsappMessageId: eventId("retry-before-send") },
    }), 1);

    // Simulate an interrupted process that could have reached Meta.
    await db.webhookEvent.create({
      data: {
        eventId: eventId("interrupted"),
        businessId: firstBusiness,
        fromNumber: senderNumber,
        bodyText: "¿Qué horario tienen?",
        status: "sending", deliveryState: "sending",
        claimExpiresAt: new Date(Date.now() - 5_000),
      },
    });
    assert.equal(await handleWhatsAppInbound(input("interrupted"), fakeSender), "needs_review");
    assert.equal(outboundCount, 2);
    const stuck = await db.webhookEvent.findUnique({ where: { eventId: eventId("interrupted") } });
    assert.equal(stuck?.deliveryState, "uncertain");
    assert.equal(stuck?.status, "needs_review");

    console.log("PASS: durable WhatsApp delivery, duplicate suppression, tenant check, ambiguous send, safe retry, expired lease.");
  } finally {
    await db.webhookEvent.deleteMany({
      where: { eventId: { startsWith: "wamid.test." + suffix } },
    });
    await db.business.deleteMany({ where: { id: { in: [firstBusiness, secondBusiness] } } });
    await db.$disconnect();
  }
}
main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
