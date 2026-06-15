import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth";
import { DEAL_STAGES } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { title, value, stage, expectedCloseDate, companyId, contactId } =
    body ?? {};

  if (stage && !DEAL_STAGES.includes(stage)) {
    return NextResponse.json({ error: "Invalid stage" }, { status: 400 });
  }

  const existing = await prisma.deal.findFirst({
    where: { id: params.id, userId },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

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
    const deal = await prisma.deal.update({
      where: { id: params.id },
      data: {
        ...(title !== undefined && { title }),
        ...(value !== undefined && { value: Number(value) || 0 }),
        ...(stage !== undefined && {
          stage,
          closedAt: isClosed ? new Date() : null,
          ...(isClosed && { expectedCloseDate: null }),
        }),
        ...(expectedCloseDate !== undefined &&
          !isClosed && {
            expectedCloseDate: expectedCloseDate
              ? new Date(expectedCloseDate)
              : null,
          }),
        ...(companyId !== undefined && { companyId: companyId || null }),
        ...(contactId !== undefined && { contactId: contactId || null }),
      },
      include: { company: true, contact: true },
    });
    return NextResponse.json(deal);
  } catch {
    return NextResponse.json({ error: "Failed to update deal" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { count } = await prisma.deal.deleteMany({
    where: { id: params.id, userId },
  });
  if (count === 0) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
