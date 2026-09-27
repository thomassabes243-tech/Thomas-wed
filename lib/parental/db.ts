import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __parentalDb: PrismaClient | undefined;
}

export function getParentalDb() {
  const url = process.env.PARENTAL_DATABASE_URL;
  if (!url) {
    throw new Error("PARENTAL_DATABASE_URL is not configured");
  }

  if (!global.__parentalDb) {
    global.__parentalDb = new PrismaClient({
      datasources: { db: { url } },
    });
  }

  return global.__parentalDb;
}
