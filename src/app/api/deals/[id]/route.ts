import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DEAL_STAGES } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const body = await req.json();
  const { title, value, stage, expectedCloseDate, companyId, contactId } =
    body ?? {};

  if (stage && !DEAL_STAGES.includes(stage)) {
    return NextResponse.json({ error: "Invalid stage" }, { status: 400 });
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
          // Keep closedAt / expectedCloseDate consistent with the stage.
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
  } catch (e: any) {
    if (e?.code === "P2025") {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to update deal" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    await prisma.deal.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e?.code === "P2025") {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to delete deal" }, { status: 500 });
  }
}
