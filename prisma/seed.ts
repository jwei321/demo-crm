import { PrismaClient } from "@prisma/client";
import { runSeed } from "../src/lib/seed";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");
  const result = await runSeed(prisma);
  console.log("Seed complete:", {
    users: result.users,
    companies: result.companies,
    contacts: result.contacts,
    deals: result.deals,
  });
  console.log("\nDemo login:");
  console.log(`  email:    ${result.demoLogin.email}`);
  console.log(`  password: ${result.demoLogin.password}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
