import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import ContactsView from "./ContactsView";

export const dynamic = "force-dynamic";

export default async function ContactsPage() {
  const { sub: userId } = await requireUser();
  const [contacts, companies] = await Promise.all([
    prisma.contact.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { company: true },
    }),
    prisma.company.findMany({
      where: { userId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return <ContactsView initialContacts={contacts} companies={companies} />;
}
