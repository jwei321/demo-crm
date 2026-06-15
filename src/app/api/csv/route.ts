import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

// ─── CSV Export ──────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const type = new URL(req.url).searchParams.get("type") ?? "contacts";

  if (type === "contacts") {
    const rows = await prisma.contact.findMany({
      where: { userId },
      orderBy: { lastName: "asc" },
      include: { company: { select: { name: true } } },
    });

    const header = "First Name,Last Name,Email,Phone,Title,Status,Company,Created\n";
    const body = rows
      .map((r) =>
        [r.firstName, r.lastName, r.email, r.phone ?? "", r.title ?? "", r.status, r.company?.name ?? "", r.createdAt.toISOString().slice(0, 10)]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(","),
      )
      .join("\n");

    return new Response(header + body, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="contacts-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  if (type === "companies") {
    const rows = await prisma.company.findMany({
      where: { userId },
      orderBy: { name: "asc" },
      include: { _count: { select: { contacts: true, deals: true } } },
    });

    const header = "Name,Industry,Website,City,Country,Employees,Annual Revenue,Contacts,Deals,Created\n";
    const body = rows
      .map((r) =>
        [r.name, r.industry, r.website ?? "", r.city ?? "", r.country ?? "", r.employees, Number(r.annualRevenue), r._count.contacts, r._count.deals, r.createdAt.toISOString().slice(0, 10)]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(","),
      )
      .join("\n");

    return new Response(header + body, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="companies-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  if (type === "deals") {
    const rows = await prisma.deal.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { company: { select: { name: true } }, contact: { select: { firstName: true, lastName: true } } },
    });

    const header = "Title,Stage,Value,Company,Contact,Expected Close,Created\n";
    const body = rows
      .map((r) =>
        [r.title, r.stage, Number(r.value), r.company?.name ?? "", r.contact ? `${r.contact.firstName} ${r.contact.lastName}` : "", r.expectedCloseDate?.toISOString().slice(0, 10) ?? "", r.createdAt.toISOString().slice(0, 10)]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(","),
      )
      .join("\n");

    return new Response(header + body, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="deals-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  return NextResponse.json({ error: "type must be contacts, companies, or deals" }, { status: 400 });
}

// ─── CSV Import (contacts only) ───────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body?.csv || typeof body.csv !== "string") {
    return NextResponse.json({ error: "csv string is required" }, { status: 400 });
  }

  const lines = body.csv.split("\n").map((l: string) => l.trim()).filter(Boolean);
  if (lines.length < 2) return NextResponse.json({ error: "No data rows found" }, { status: 400 });

  // Parse header row (case-insensitive, trimmed, unquoted)
  const parseVal = (v: string) => v.replace(/^["']|["']$/g, "").trim();
  const headers = lines[0].split(",").map(parseVal).map((h: string) => h.toLowerCase());

  const idx = (names: string[]) => {
    for (const n of names) {
      const i = headers.indexOf(n);
      if (i !== -1) return i;
    }
    return -1;
  };

  const iFirst = idx(["first name", "firstname", "first_name"]);
  const iLast = idx(["last name", "lastname", "last_name"]);
  const iEmail = idx(["email", "email address"]);

  if (iEmail === -1) {
    return NextResponse.json({ error: "CSV must have an 'email' column" }, { status: 400 });
  }

  const iPhone = idx(["phone", "phone number"]);
  const iTitle = idx(["title", "job title"]);
  const iStatus = idx(["status"]);
  const iCompany = idx(["company", "company name", "account"]);

  // Fetch user companies for name→id lookup
  const companies = await prisma.company.findMany({
    where: { userId },
    select: { id: true, name: true },
  });
  const companyMap = new Map(companies.map((c) => [c.name.toLowerCase(), c.id]));

  const VALID_STATUSES = new Set(["LEAD", "QUALIFIED", "CUSTOMER", "CHURNED"]);

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map(parseVal);
    const email = cols[iEmail]?.toLowerCase();
    if (!email) { skipped++; continue; }

    const firstName = iFirst !== -1 ? cols[iFirst] : email.split("@")[0];
    const lastName = iLast !== -1 ? cols[iLast] : "";
    const rawStatus = (iStatus !== -1 ? cols[iStatus] : "").toUpperCase();
    const status = VALID_STATUSES.has(rawStatus) ? rawStatus : "LEAD";
    const companyName = iCompany !== -1 ? cols[iCompany] : "";
    const companyId = companyName ? companyMap.get(companyName.toLowerCase()) ?? null : null;

    try {
      await prisma.contact.upsert({
        where: { userId_email: { userId, email } },
        update: {
          ...(firstName && { firstName }),
          ...(lastName && { lastName }),
          ...(iPhone !== -1 && cols[iPhone] && { phone: cols[iPhone] }),
          ...(iTitle !== -1 && cols[iTitle] && { title: cols[iTitle] }),
          ...(companyId !== undefined && { companyId }),
        },
        create: {
          email,
          firstName: firstName || email.split("@")[0],
          lastName: lastName || "",
          phone: iPhone !== -1 ? cols[iPhone] || null : null,
          title: iTitle !== -1 ? cols[iTitle] || null : null,
          status: status as "LEAD" | "QUALIFIED" | "CUSTOMER" | "CHURNED",
          companyId,
          userId,
        },
      });
      imported++;
    } catch {
      errors.push(`Row ${i + 1}: skipped (${email})`);
      skipped++;
    }
  }

  return NextResponse.json({ imported, skipped, errors });
}
