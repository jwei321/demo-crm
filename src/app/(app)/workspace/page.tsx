import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import WorkspaceClient from "./WorkspaceClient";

export const dynamic = "force-dynamic";

export default async function WorkspacePage() {
  const { sub: userId } = await requireUser();

  let workspace = await prisma.workspace.findFirst({
    where: { members: { some: { userId } } },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { joinedAt: "asc" },
      },
      invites: {
        where: { acceptedAt: null, expiresAt: { gt: new Date() } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!workspace) {
    workspace = await prisma.workspace.create({
      data: {
        name: "My Workspace",
        slug: `ws-${userId.slice(0, 8)}`,
        ownerId: userId,
        members: { create: { userId, role: "OWNER" } },
      },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true } } },
          orderBy: { joinedAt: "asc" },
        },
        invites: {
          where: { acceptedAt: null, expiresAt: { gt: new Date() } },
          orderBy: { createdAt: "desc" },
        },
      },
    });
  }

  const currentMember = workspace.members.find((m) => m.userId === userId);
  const canInvite = currentMember?.role === "OWNER" || currentMember?.role === "ADMIN";

  return (
    <WorkspaceClient
      workspace={{
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        members: workspace.members.map((m) => ({
          userId: m.userId,
          role: m.role,
          name: m.user.name,
          email: m.user.email,
        })),
        invites: workspace.invites.map((i) => ({
          id: i.id,
          email: i.email,
          role: i.role,
          expiresAt: i.expiresAt.toISOString(),
        })),
      }}
      currentUserId={userId}
      canInvite={canInvite}
    />
  );
}
