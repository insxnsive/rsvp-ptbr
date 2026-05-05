import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";
import { createMongoStore } from "./db.js";

async function main(): Promise<void> {
  let app: Awaited<ReturnType<typeof buildApp>> | undefined;

  try {
    const config = loadConfig();
    const store = await createMongoStore(config);
    app = await buildApp({ config, store });
    await app.listen({ host: config.host, port: config.port });
  } catch (error) {
    if (app) {
      app.log.error(error);
      await app.close();
    } else {
      console.error(error);
    }
    process.exit(1);
  }
}

await main();
