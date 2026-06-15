import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const completed = searchParams.get("completed");
  const contactId = searchParams.get("contactId") ?? undefined;
  const dealId = searchParams.get("dealId") ?? undefined;

  const tasks = await prisma.task.findMany({
    where: {
      userId,
      ...(completed !== null && { completed: completed === "true" }),
      ...(contactId && { contactId }),
      ...(dealId && { dealId }),
    },
    orderBy: [{ completed: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
    include: {
      contact: { select: { id: true, firstName: true, lastName: true } },
      deal: { select: { id: true, title: true } },
    },
  });

  return NextResponse.json(tasks);
}

export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { title, dueDate, priority, contactId, dealId } = body ?? {};

  if (!title?.trim()) {
    return NextResponse.json({ error: "Title is required." }, { status: 400 });
  }

  const task = await prisma.task.create({
    data: {
      title: title.trim(),
      dueDate: dueDate ? new Date(dueDate) : null,
      priority: priority ?? "MEDIUM",
      userId,
      contactId: contactId || null,
      dealId: dealId || null,
    },
    include: {
      contact: { select: { id: true, firstName: true, lastName: true } },
      deal: { select: { id: true, title: true } },
    },
  });

  return NextResponse.json(task, { status: 201 });
}
