import { config } from "dotenv";
import { join } from "node:path";
import { repoRoot } from "./db/client.ts";
import { migrate } from "./db/migrate.ts";
import { seedProfileIfNeeded } from "./profile.ts";
import { refreshAll } from "./refresh.ts";
import { seedBoardsIfNeeded } from "./seedBoards.ts";

config({ path: join(repoRoot, ".env") });
migrate();
seedProfileIfNeeded();
seedBoardsIfNeeded();

const cmd = process.argv[2];
if (cmd === "refresh") {
  const result = await refreshAll();
  console.log(JSON.stringify(result, null, 2));
} else {
  console.error("usage: tsx src/cli.ts refresh");
  process.exit(1);
}
