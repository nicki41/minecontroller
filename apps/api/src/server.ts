import { EnvValidationError } from "./config/env-errors.js";

async function main() {
  // Dynamic imports: config/env.js validates process.env as soon as it's
  // evaluated and throws EnvValidationError on failure. Importing it (and
  // everything that transitively imports it) here, inside the try below,
  // is what turns that into a clean one-time startup message instead of a
  // raw stack trace — see config/env.ts for why it doesn't process.exit()
  // itself.
  const { env } = await import("./config/env.js");
  const { buildApp } = await import("./app.js");
  const { seedRolesAndPermissions } = await import("./lib/seedRbac.js");

  const app = await buildApp();

  try {
    await seedRolesAndPermissions(app.prisma);
    app.log.info("Roles and permissions seeded.");
  } catch (err) {
    app.log.error({ err }, "Failed to seed roles/permissions");
  }

  await app.listen({ host: "0.0.0.0", port: env.PORT });

  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, async () => {
      app.log.info({ signal }, "Shutting down...");
      await app.close();
      process.exit(0);
    });
  }
}

main().catch((err) => {
  if (err instanceof EnvValidationError) {
    console.error("Invalid environment configuration:");
    for (const issue of err.issues) console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
  } else {
    console.error(err);
  }
  process.exit(1);
});
