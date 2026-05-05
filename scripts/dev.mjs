import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const isWindows = process.platform === "win32";

const apiCommand = isWindows
  ? path.join(rootDir, "node_modules", ".bin", "tsx.cmd")
  : path.join(rootDir, "node_modules", ".bin", "tsx");
const webCommand = isWindows
  ? path.join(rootDir, "node_modules", ".bin", "vite.cmd")
  : path.join(rootDir, "node_modules", ".bin", "vite");

function start(name, command, args, env = process.env) {
  const child = spawn(command, args, {
    cwd: rootDir,
    env,
    stdio: "inherit",
    windowsHide: false,
    shell: isWindows
  });

  child.on("exit", (code, signal) => {
    if (shuttingDown) {
      return;
    }
    const detail = signal ? `signal ${signal}` : `code ${code ?? 0}`;
    console.error(`[${name}] exited with ${detail}`);
    shutdown(code ?? 1);
  });

  child.on("error", (error) => {
    if (shuttingDown) {
      return;
    }
    console.error(`[${name}] failed to start`, error);
    shutdown(1);
  });

  return child;
}

let shuttingDown = false;
let exitCode = 0;

const api = start("api", apiCommand, ["watch", "src/server/index.ts"], {
  ...process.env,
  NODE_ENV: "development"
});
const web = start("web", webCommand, ["--host", "127.0.0.1", "--port", "5173"], process.env);

function stop(child) {
  if (child.exitCode !== null || child.killed) {
    return;
  }
  if (isWindows) {
    spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"], { stdio: "ignore", windowsHide: true });
    return;
  }
  child.kill("SIGTERM");
}

function shutdown(code = 0) {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  exitCode = code;
  stop(api);
  stop(web);
  setTimeout(() => process.exit(exitCode), 250);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
