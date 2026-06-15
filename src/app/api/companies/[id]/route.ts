import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, industry, website, employees, annualRevenue, city, country } =
    body ?? {};

  const existing = await prisma.company.findFirst({
    where: { id: params.id, userId },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  try {
    const company = await prisma.company.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(industry !== undefined && { industry }),
        ...(website !== undefined && { website: website || null }),
        ...(employees !== undefined && { employees: Number(employees) || 0 }),
        ...(annualRevenue !== undefined && {
          annualRevenue: Number(annualRevenue) || 0,
        }),
        ...(city !== undefined && { city: city || null }),
        ...(country !== undefined && { country: country || null }),
      },
    });
    return NextResponse.json(company);
  } catch {
    return NextResponse.json({ error: "Failed to update company" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { count } = await prisma.company.deleteMany({
    where: { id: params.id, userId },
  });
  if (count === 0) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
