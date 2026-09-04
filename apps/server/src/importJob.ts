import { detectAtsApplyUrl, fingerprint, type RawPosting } from "@astra/core";
import { and, eq } from "drizzle-orm";
import { db } from "./db/client.ts";
import { companyBoards } from "./db/schema.ts";
import { classifyJobId, rebuildQueue } from "./refresh.ts";
import { upsertPosting } from "./upsert.ts";

export type ImportPayload = {
  source?: string;
  title: string;
  company: string;
  location?: string;
  url: string;
  applyUrl?: string;
  description?: string;
};

function capturedBoard() {
  const existing = db
    .select()
    .from(companyBoards)
    .where(and(eq(companyBoards.ats, "captured"), eq(companyBoards.slug, "manual")))
    .all()[0];
  if (existing) return existing;
  const inserted = db
    .insert(companyBoards)
    .values({
      name: "Captured (you sent)",
      ats: "captured",
      slug: "manual",
      kind: "remote_first",
      locationHint: "LinkedIn / Indeed / Wellfound / Glassdoor tabs you opened",
      active: true,
    })
    .run();
  return db
    .select()
    .from(companyBoards)
    .where(eq(companyBoards.id, Number(inserted.lastInsertRowid)))
    .all()[0]!;
}

export function importCapturedJob(payload: ImportPayload) {
  if (!payload.title?.trim() || !payload.company?.trim() || !payload.url?.trim()) {
    throw new Error("title, company, and url are required");
  }
  const blob = `${payload.url}\n${payload.applyUrl ?? ""}\n${payload.description ?? ""}`;
  const detected = detectAtsApplyUrl(blob);
  const applyUrl = detected?.url ?? payload.applyUrl ?? payload.url;
  const posting: RawPosting = {
    externalId: fingerprint(payload.company, payload.title) || payload.url,
    title: payload.title.trim(),
    company: payload.company.trim(),
    location: payload.location?.trim() || "Remote",
    remote: true,
    url: payload.url.trim(),
    applyUrl,
    description: payload.description ?? "",
    postedAt: new Date(),
  };
  const board = capturedBoard();
  const result = upsertPosting(board, posting, {
    notes: `captured from ${payload.source ?? "browser"}`,
  });
  classifyJobId(result.id);
  rebuildQueue(20);
  return { ...result, applyUrl, detectedAts: detected?.ats ?? null };
}
