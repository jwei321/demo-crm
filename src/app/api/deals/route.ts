import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth";
import { DEAL_STAGES } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const deals = await prisma.deal.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { company: true, contact: true },
  });
  return NextResponse.json(deals);
}

export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { title, value, stage, expectedCloseDate, companyId, contactId } =
    body ?? {};

  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }
  if (stage && !DEAL_STAGES.includes(stage)) {
    return NextResponse.json({ error: "Invalid stage" }, { status: 400 });
  }

  // Only allow linking to records the user owns.
  if (companyId) {
    const owned = await prisma.company.findFirst({
      where: { id: companyId, userId },
      select: { id: true },
    });
    if (!owned) {
      return NextResponse.json({ error: "Invalid company" }, { status: 400 });
    }
  }
  if (contactId) {
    const owned = await prisma.contact.findFirst({
      where: { id: contactId, userId },
      select: { id: true },
    });
    if (!owned) {
      return NextResponse.json({ error: "Invalid contact" }, { status: 400 });
    }
  }

  const isClosed = stage === "CLOSED_WON" || stage === "CLOSED_LOST";

  try {
    const deal = await prisma.deal.create({
      data: {
        title,
        value: Number(value) || 0,
        stage: stage ?? "PROSPECTING",
        expectedCloseDate:
          !isClosed && expectedCloseDate ? new Date(expectedCloseDate) : null,
        closedAt: isClosed ? new Date() : null,
        companyId: companyId || null,
        contactId: contactId || null,
        userId,
      },
      include: { company: true, contact: true },
    });
    return NextResponse.json(deal, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create deal" }, { status: 500 });
  }
}
