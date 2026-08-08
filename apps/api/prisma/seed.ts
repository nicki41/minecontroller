import { PrismaClient } from "@prisma/client";
import { seedRolesAndPermissions } from "../src/lib/seedRbac.js";

// CLI entry point for `npm run prisma:seed` / `prisma db seed`. The same
// logic also runs automatically on every API boot (see src/server.ts) so a
// fresh `docker compose up -d` needs no manual seeding step.
const prisma = new PrismaClient();

seedRolesAndPermissions(prisma)
  .then(() => {
    // eslint-disable-next-line no-console
    console.log("Seeded permissions and system roles.");
  })
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
