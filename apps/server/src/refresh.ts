import {
  CATALOG_ATS,
  classifyAuth,
  classifyTitle,
  fetchBoard,
  fingerprint,
  isHardSkip,
  regionFor,
  scoreJob,
  type Ats,
  type BoardKind,
} from "@astra/core";
import { eq, notInArray } from "drizzle-orm";
import { db } from "./db/client.ts";
import { companyBoards, jobs } from "./db/schema.ts";
import { getProfile } from "./profile.ts";
import { upsertPosting } from "./upsert.ts";

const TERMINAL = ["applied", "interviewing", "offer", "rejected"] as const;

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function classifyJobId(jobId: number) {
  const job = db.select().from(jobs).where(eq(jobs.id, jobId)).all()[0];
  if (!job) return;
  if ((TERMINAL as readonly string[]).includes(job.status)) return;
  const board = db.select().from(companyBoards).where(eq(companyBoards.id, job.companyBoardId)).all()[0];
  const profile = getProfile();
  const kind = (board?.kind ?? "remote_first") as BoardKind;
  const blob = `${job.title}\n${job.location}\n${job.description}`;
  const hiringGeo = classifyAuth(blob);
  const roleFit = classifyTitle(job.title, job.description, kind);
  const region = regionFor(job.location, job.title);
  const score = scoreJob({
    title: job.title,
    description: job.description,
    postedAt: job.postedAt ? new Date(job.postedAt) : null,
    hiringGeo,
    boardKind: kind,
    skills: profile.skills,
  });
  const skip = isHardSkip(roleFit, hiringGeo);
  db.update(jobs)
    .set({
      hiringGeo,
      roleFit,
      region,
      score,
      fingerprint: job.fingerprint || fingerprint(job.company, job.title),
      status: skip ? "skipped" : job.status === "skipped" && !skip ? "new" : job.status,
    })
    .where(eq(jobs.id, job.id))
    .run();
}

export function classifyAndScoreAll() {
  const profile = getProfile();
  const boards = db.select().from(companyBoards).all();
  const boardById = new Map(boards.map((b) => [b.id, b]));
  const rows = db.select().from(jobs).all();

  for (const job of rows) {
    if ((TERMINAL as readonly string[]).includes(job.status)) continue;
    const board = boardById.get(job.companyBoardId);
    const kind = (board?.kind ?? "remote_first") as BoardKind;
    const blob = `${job.title}\n${job.location}\n${job.description}`;
    const hiringGeo = classifyAuth(blob);
    const roleFit = classifyTitle(job.title, job.description, kind);
    const region = regionFor(job.location, job.title);
    const score = scoreJob({
      title: job.title,
      description: job.description,
      postedAt: job.postedAt ? new Date(job.postedAt) : null,
      hiringGeo,
      boardKind: kind,
      skills: profile.skills,
    });
    const skip = isHardSkip(roleFit, hiringGeo);
    const nextStatus = skip && job.status !== "skipped" && job.status !== "queued" ? "skipped" : job.status;
    db.update(jobs)
      .set({
        hiringGeo,
        roleFit,
        region,
        score,
        fingerprint: job.fingerprint || fingerprint(job.company, job.title),
        status: skip ? "skipped" : nextStatus === "skipped" && !skip ? "new" : job.status,
      })
      .where(eq(jobs.id, job.id))
      .run();
  }
}

export function rebuildQueue(limit = 20) {
  const keep = [...TERMINAL, "skipped", "applying"] as string[];
  db.update(jobs).set({ status: "new", queuedOn: null }).where(eq(jobs.status, "queued")).run();
  const candidates = db
    .select()
    .from(jobs)
    .where(notInArray(jobs.status, keep))
    .all()
    .filter((j) => !isHardSkip(j.roleFit as "rails", j.hiringGeo as "worldwide"))
    .sort((a, b) => b.score - a.score || (b.postedAt ?? "").localeCompare(a.postedAt ?? ""));

  const date = today();
  const take: typeof candidates = [];
  const perCompany = new Map<string, number>();
  const cap = 2;
  for (const job of candidates) {
    if (take.length >= limit) break;
    const used = perCompany.get(job.company) ?? 0;
    if (used >= cap) continue;
    take.push(job);
    perCompany.set(job.company, used + 1);
  }
  for (const job of candidates) {
    if (take.length >= limit) break;
    if (take.includes(job)) continue;
    take.push(job);
  }

  for (const job of take) {
    db.update(jobs)
      .set({ status: "queued", queuedOn: job.queuedOn ?? date })
      .where(eq(jobs.id, job.id))
      .run();
  }
}

export async function refreshAll(): Promise<{ boards: number; created: number; errors: string[] }> {
  const active = db.select().from(companyBoards).where(eq(companyBoards.active, true)).all();
  let created = 0;
  const errors: string[] = [];

  for (const board of active) {
    try {
      const { postings } = await fetchBoard(board.ats as Ats, board.slug, board.name);
      const seen = new Set<string>();
      for (const p of postings) {
        seen.add(p.externalId);
        const result = upsertPosting(board, p);
        if (result.created) created += 1;
      }

      if ((CATALOG_ATS as string[]).includes(board.ats)) {
        const stale = db
          .select()
          .from(jobs)
          .where(eq(jobs.companyBoardId, board.id))
          .all()
          .filter((j) => !seen.has(j.externalId) && (j.status === "new" || j.status === "queued"));
        for (const j of stale) {
          db.update(jobs)
            .set({ status: "skipped", notes: j.notes ? j.notes : "posting_removed" })
            .where(eq(jobs.id, j.id))
            .run();
        }
      }

      db.update(companyBoards)
        .set({ lastFetchedAt: new Date().toISOString(), lastError: null })
        .where(eq(companyBoards.id, board.id))
        .run();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`${board.name}: ${message}`);
      db.update(companyBoards)
        .set({ lastError: message, lastFetchedAt: new Date().toISOString() })
        .where(eq(companyBoards.id, board.id))
        .run();
    }
    await new Promise((r) => setTimeout(r, 150));
  }

  classifyAndScoreAll();
  rebuildQueue(20);
  return { boards: active.length, created, errors };
}

export function rescore() {
  classifyAndScoreAll();
  rebuildQueue(20);
}
