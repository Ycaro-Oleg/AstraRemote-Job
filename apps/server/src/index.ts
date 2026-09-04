import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { config } from "dotenv";
import { join } from "node:path";
import { app } from "./app.ts";
import { repoRoot } from "./db/client.ts";
import { migrate } from "./db/migrate.ts";
import { seedProfileIfNeeded } from "./profile.ts";
import { refreshAll } from "./refresh.ts";
import { seedBoardsIfNeeded } from "./seedBoards.ts";

config({ path: join(repoRoot, ".env") });

migrate();
seedProfileIfNeeded();
seedBoardsIfNeeded();

app.use("/*", serveStatic({ root: "./public" }));

const port = Number(process.env.PORT ?? 8790);
const host = process.env.HOST ?? "127.0.0.1";

serve({ fetch: app.fetch, port, hostname: host }, (info) => {
  console.log(`AstraRemote-Job on http://${info.address}:${info.port}`);
});

const SIX_HOURS = 6 * 60 * 60 * 1000;
setInterval(() => {
  refreshAll().catch((err) => console.error("scheduled refresh failed", err));
}, SIX_HOURS);
