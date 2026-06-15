import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import TasksView from "./TasksView";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const { sub: userId } = await requireUser();

  const tasks = await prisma.task.findMany({
    where: { userId },
    orderBy: [{ completed: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
    include: {
      contact: { select: { id: true, firstName: true, lastName: true } },
      deal: { select: { id: true, title: true } },
    },
  });

  const contacts = await prisma.contact.findMany({
    where: { userId },
    orderBy: { lastName: "asc" },
    select: { id: true, firstName: true, lastName: true },
  });

  const deals = await prisma.deal.findMany({
    where: { userId },
    orderBy: { title: "asc" },
    select: { id: true, title: true },
  });

  return (
    <TasksView
      initialTasks={tasks.map((t) => ({
        ...t,
        dueDate: t.dueDate ? t.dueDate.toISOString() : null,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      }))}
      contacts={contacts}
      deals={deals}
    />
  );
}
