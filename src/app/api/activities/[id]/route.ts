import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { count } = await prisma.activity.deleteMany({ where: { id: params.id, userId } });
  if (count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { content } = body ?? {};

  const existing = await prisma.activity.findFirst({ where: { id: params.id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const activity = await prisma.activity.update({
    where: { id: params.id },
    data: { ...(content !== undefined && { content: content.trim() }) },
    include: { contact: { select: { id: true, firstName: true, lastName: true } }, deal: { select: { id: true, title: true } } },
  });
  return NextResponse.json(activity);
}
