import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId, getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
}

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspace = await prisma.workspace.findUnique({
    where: { ownerId: userId },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true } } } },
      invites: { where: { acceptedAt: null, expiresAt: { gt: new Date() } } },
    },
  });

  return NextResponse.json(workspace);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name } = await req.json().catch(() => ({}));
  if (!name?.trim()) return NextResponse.json({ error: "Workspace name is required." }, { status: 400 });

  const existing = await prisma.workspace.findUnique({ where: { ownerId: session.sub } });
  if (existing) return NextResponse.json({ error: "You already have a workspace." }, { status: 409 });

  let slug = slugify(name);
  // ensure uniqueness
  const taken = await prisma.workspace.findUnique({ where: { slug } });
  if (taken) slug = `${slug}-${Date.now().toString(36)}`;

  const workspace = await prisma.workspace.create({
    data: {
      name: name.trim(),
      slug,
      ownerId: session.sub,
      members: { create: { userId: session.sub, role: "OWNER" } },
    },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true } } } },
      invites: true,
    },
  });

  return NextResponse.json(workspace, { status: 201 });
}
