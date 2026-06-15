import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

const ALLOWED_STATUSES = ["LEAD", "QUALIFIED", "CUSTOMER", "CHURNED"] as const;
type ContactStatus = (typeof ALLOWED_STATUSES)[number];

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { firstName, lastName, email, phone, title, status, companyId } =
    body ?? {};

  if (status && !ALLOWED_STATUSES.includes(status as ContactStatus)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const existing = await prisma.contact.findFirst({
    where: { id: params.id, userId },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
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

  try {
    const contact = await prisma.contact.update({
      where: { id: params.id },
      data: {
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone: phone || null }),
        ...(title !== undefined && { title: title || null }),
        ...(status !== undefined && { status: status as ContactStatus }),
        ...(companyId !== undefined && { companyId: companyId || null }),
      },
      include: { company: true },
    });
    return NextResponse.json(contact);
  } catch (e: any) {
    if (e?.code === "P2002") {
      return NextResponse.json(
        { error: "A contact with that email already exists" },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: "Failed to update contact" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { count } = await prisma.contact.deleteMany({
    where: { id: params.id, userId },
  });
  if (count === 0) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
