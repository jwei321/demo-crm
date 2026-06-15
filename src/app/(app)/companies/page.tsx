import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import CompaniesView from "./CompaniesView";

export const dynamic = "force-dynamic";

export default async function CompaniesPage() {
  const { sub: userId } = await requireUser();
  const companies = await prisma.company.findMany({
    where: { userId },
    orderBy: { name: "asc" },
    include: {
      _count: { select: { contacts: true, deals: true } },
    },
  });

  const serialized = companies.map((c) => ({
    ...c,
    annualRevenue: Number(c.annualRevenue),
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }));

  return <CompaniesView initialCompanies={serialized} />;
}
