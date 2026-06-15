import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = (new URL(req.url).searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json({ contacts: [], companies: [], deals: [] });

  const search = `%${q}%`;

  const [contacts, companies, deals] = await Promise.all([
    prisma.$queryRaw<{ id: string; label: string; sub: string }[]>`
      SELECT id, (CONCAT("firstName", ' ', "lastName")) AS label, email AS sub
      FROM "Contact"
      WHERE "userId" = ${userId}
        AND (LOWER("firstName" || ' ' || "lastName") LIKE LOWER(${search}) OR LOWER(email) LIKE LOWER(${search}))
      LIMIT 5
    `,
    prisma.$queryRaw<{ id: string; label: string; sub: string }[]>`
      SELECT id, name AS label, industry AS sub
      FROM "Company"
      WHERE "userId" = ${userId} AND LOWER(name) LIKE LOWER(${search})
      LIMIT 5
    `,
    prisma.$queryRaw<{ id: string; label: string; sub: string }[]>`
      SELECT id, title AS label, stage AS sub
      FROM "Deal"
      WHERE "userId" = ${userId} AND LOWER(title) LIKE LOWER(${search})
      LIMIT 5
    `,
  ]);

  return NextResponse.json({
    contacts: contacts.map((r) => ({ ...r, type: "contact" as const })),
    companies: companies.map((r) => ({ ...r, type: "company" as const })),
    deals: deals.map((r) => ({ ...r, type: "deal" as const })),
  });
}
