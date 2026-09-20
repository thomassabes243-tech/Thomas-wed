import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const [businesses, products] = await Promise.all([
      db.business.count(),
      db.product.count(),
    ]);

    return NextResponse.json({
      ok: true,
      database: "connected",
      businesses,
      products,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        database: "error",
        error: error instanceof Error ? error.message : "Database connection failed",
      },
      { status: 500 },
    );
  }
}
