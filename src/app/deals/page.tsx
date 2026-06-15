import { prisma } from "@/lib/prisma";
import DealsView from "./DealsView";

export const dynamic = "force-dynamic";

export default async function DealsPage() {
  const [deals, companies, contacts] = await Promise.all([
    prisma.deal.findMany({
      orderBy: { createdAt: "desc" },
      include: { company: true, contact: true },
    }),
    prisma.company.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.contact.findMany({
      orderBy: { lastName: "asc" },
      select: { id: true, firstName: true, lastName: true, companyId: true },
    }),
  ]);

  const serialized = deals.map((d) => ({
    id: d.id,
    title: d.title,
    value: Number(d.value),
    stage: d.stage,
    expectedCloseDate: d.expectedCloseDate
      ? d.expectedCloseDate.toISOString()
      : null,
    closedAt: d.closedAt ? d.closedAt.toISOString() : null,
    companyId: d.companyId,
    contactId: d.contactId,
    company: d.company ? { id: d.company.id, name: d.company.name } : null,
    contact: d.contact
      ? {
          id: d.contact.id,
          firstName: d.contact.firstName,
          lastName: d.contact.lastName,
        }
      : null,
  }));

  return (
    <DealsView
      initialDeals={serialized}
      companies={companies}
      contacts={contacts}
    />
  );
}
