import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

const VALID_TYPES = ["NOTE", "CALL", "EMAIL", "MEETING"] as const;

export async function GET(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const contactId = searchParams.get("contactId") ?? undefined;
  const dealId = searchParams.get("dealId") ?? undefined;
  const companyId = searchParams.get("companyId") ?? undefined;

  const activities = await prisma.activity.findMany({
    where: { userId, ...(contactId && { contactId }), ...(dealId && { dealId }), ...(companyId && { companyId }) },
    orderBy: { occurredAt: "desc" },
    take: 100,
    include: { contact: { select: { id: true, firstName: true, lastName: true } }, deal: { select: { id: true, title: true } } },
  });

  return NextResponse.json(activities);
}

export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { type, content, contactId, dealId, companyId, occurredAt } = body ?? {};

  if (!type || !VALID_TYPES.includes(type)) {
    return NextResponse.json({ error: "Valid type is required (NOTE, CALL, EMAIL, MEETING)." }, { status: 400 });
  }
  if (!content?.trim()) {
    return NextResponse.json({ error: "Content is required." }, { status: 400 });
  }

  const activity = await prisma.activity.create({
    data: {
      type,
      content: content.trim(),
      userId,
      contactId: contactId || null,
      dealId: dealId || null,
      companyId: companyId || null,
      occurredAt: occurredAt ? new Date(occurredAt) : new Date(),
    },
    include: { contact: { select: { id: true, firstName: true, lastName: true } }, deal: { select: { id: true, title: true } } },
  });

  return NextResponse.json(activity, { status: 201 });
}
