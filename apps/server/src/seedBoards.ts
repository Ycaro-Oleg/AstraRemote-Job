import { readFileSync } from "node:fs";
import { join } from "node:path";
import { and, eq } from "drizzle-orm";
import { repoRoot, db } from "./db/client.ts";
import { companyBoards } from "./db/schema.ts";

type SeedBoard = {
  name: string;
  ats: string;
  slug: string;
  kind: string;
  locationHint?: string;
};

export function seedBoardsIfNeeded() {
  const raw = readFileSync(join(repoRoot, "data/boards.seed.json"), "utf8");
  const boards = JSON.parse(raw) as SeedBoard[];
  for (const b of boards) {
    const existing = db
      .select()
      .from(companyBoards)
      .where(and(eq(companyBoards.ats, b.ats), eq(companyBoards.slug, b.slug)))
      .all()[0];
    if (existing) continue;
    db.insert(companyBoards)
      .values({
        name: b.name,
        ats: b.ats,
        slug: b.slug,
        kind: b.kind,
        locationHint: b.locationHint ?? "",
        active: true,
      })
      .run();
  }
}
