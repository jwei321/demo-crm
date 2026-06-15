import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth";
import { sendEmail, workspaceInviteEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { email, role } = await req.json().catch(() => ({}));
  if (!email) return NextResponse.json({ error: "Email is required." }, { status: 400 });

  // Workspace must exist and user must be owner or admin
  const workspace = await prisma.workspace.findFirst({
    where: { members: { some: { userId, role: { in: ["OWNER", "ADMIN"] } } } },
    include: { owner: { select: { name: true } } },
  });

  if (!workspace) {
    return NextResponse.json({ error: "No workspace found or you lack permission to invite." }, { status: 403 });
  }

  // Idempotent: upsert invite
  const invite = await prisma.workspaceInvite.upsert({
    where: { workspaceId_email: { workspaceId: workspace.id, email } },
    update: {
      token: undefined, // keep existing token
      expiresAt: new Date(Date.now() + SEVEN_DAYS),
      acceptedAt: null,
      role: role ?? "MEMBER",
    },
    create: {
      workspaceId: workspace.id,
      email,
      role: role ?? "MEMBER",
      invitedById: userId,
      expiresAt: new Date(Date.now() + SEVEN_DAYS),
    },
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://relay.app";
  const inviteUrl = `${baseUrl}/accept-invite?token=${invite.token}`;

  try {
    await sendEmail({
      to: email,
      subject: `${workspace.owner.name} invited you to ${workspace.name} on Relay`,
      html: workspaceInviteEmail(workspace.owner.name, workspace.name, inviteUrl),
    });
  } catch (err) {
    console.error("Failed to send invite email:", err);
  }

  return NextResponse.json({ ok: true, invite });
}
