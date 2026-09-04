import { CATALOG_ATS, fingerprint, type Ats, type RawPosting } from "@astra/core";
import { and, eq } from "drizzle-orm";
import { db } from "./db/client.ts";
import { jobs } from "./db/schema.ts";

export function upsertPosting(
  board: { id: number; ats: string },
  p: RawPosting,
  extra?: { notes?: string },
): { created: boolean; id: number; duplicate: boolean } {
  const fp = fingerprint(p.company, p.title);
  const byExternal = db
    .select()
    .from(jobs)
    .where(and(eq(jobs.companyBoardId, board.id), eq(jobs.externalId, p.externalId)))
    .all()[0];

  const values = {
    title: p.title,
    location: p.location,
    remote: p.remote,
    url: p.url,
    applyUrl: p.applyUrl,
    description: p.description,
    postedAt: p.postedAt ? p.postedAt.toISOString() : null,
    expiresAt: p.expiresAt ? p.expiresAt.toISOString() : null,
    fingerprint: fp,
  };

  if (byExternal) {
    db.update(jobs).set(values).where(eq(jobs.id, byExternal.id)).run();
    return { created: false, id: byExternal.id, duplicate: false };
  }

  const byFp = fp ? db.select().from(jobs).where(eq(jobs.fingerprint, fp)).all()[0] : undefined;
  if (byFp) {
    const oldCatalog = (CATALOG_ATS as string[]).includes(byFp.ats);
    const newCatalog = (CATALOG_ATS as string[]).includes(board.ats);
    if (!oldCatalog && newCatalog) {
      db.update(jobs)
        .set({
          ...values,
          ats: board.ats,
          companyBoardId: board.id,
          externalId: p.externalId,
        })
        .where(eq(jobs.id, byFp.id))
        .run();
    }
    return { created: false, id: byFp.id, duplicate: true };
  }

  const inserted = db
    .insert(jobs)
    .values({
      companyBoardId: board.id,
      externalId: p.externalId,
      ats: board.ats as Ats,
      company: p.company,
      status: "new",
      notes: extra?.notes ?? null,
      ...values,
    })
    .run();
  return { created: true, id: Number(inserted.lastInsertRowid), duplicate: false };
}
