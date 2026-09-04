import { readFileSync } from "node:fs";
import { join } from "node:path";
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
  const count = db.select().from(companyBoards).all().length;
  if (count > 0) return;
  const raw = readFileSync(join(repoRoot, "data/boards.seed.json"), "utf8");
  const boards = JSON.parse(raw) as SeedBoard[];
  for (const b of boards) {
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
