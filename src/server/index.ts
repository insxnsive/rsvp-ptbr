import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";
import { createMongoStore } from "./db.js";

let runningApp: Awaited<ReturnType<typeof buildApp>> | undefined;

async function main(): Promise<void> {
  try {
    const config = loadConfig();
    const store = await createMongoStore(config);
    runningApp = await buildApp({ config, store });
    await runningApp.listen({ host: config.host, port: config.port });
  } catch (error) {
    if (runningApp) {
      runningApp.log.error(error);
      await runningApp.close();
    } else {
      console.error(error);
    }
    process.exit(1);
  }
}

async function shutdown(signal: string) {
  console.log(`${signal} received, shutting down...`);
  if (runningApp) {
    await runningApp.close();
  }
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

await main();
