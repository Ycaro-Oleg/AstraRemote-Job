import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema.ts";

const here = dirname(fileURLToPath(import.meta.url));
export const repoRoot = join(here, "../../../../");
export const dataDir = join(repoRoot, "data");
export const sqlitePath = join(dataDir, "astra.sqlite");

mkdirSync(dataDir, { recursive: true });
mkdirSync(join(dataDir, "resumes", "generated"), { recursive: true });

const sqlite = new Database(sqlitePath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });
export { sqlite };
