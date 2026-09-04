import { isHardSkip, type Ats, type BoardKind, type Profile } from "@astra/core";
import { desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { db } from "./db/client.ts";
import { companyBoards, jobs } from "./db/schema.ts";
import { buildPacket } from "./packet.ts";
import { getProfile, saveProfile } from "./profile.ts";
import { importCapturedJob } from "./importJob.ts";
import { refreshAll, rescore } from "./refresh.ts";

export const app = new Hono();

app.use(
  "/api/*",
  cors({
    origin: (origin) => {
      if (!origin) return "http://127.0.0.1:8790";
      if (origin.startsWith("chrome-extension://")) return origin;
      if (origin.startsWith("http://127.0.0.1:") || origin.startsWith("http://localhost:")) return origin;
      return "";
    },
  }),
);

app.get("/up", (c) => c.json({ ok: true }));

app.get("/api/profile", (c) => c.json(getProfile()));

app.put("/api/profile", async (c) => {
  const body = (await c.req.json()) as Profile;
  saveProfile(body);
  return c.json(getProfile());
});

app.get("/api/boards", (c) => c.json(db.select().from(companyBoards).all()));

app.post("/api/boards", async (c) => {
  const body = (await c.req.json()) as {
    name: string;
    ats: Ats;
    slug: string;
    kind: BoardKind;
    locationHint?: string;
  };
  const result = db
    .insert(companyBoards)
    .values({
      name: body.name,
      ats: body.ats,
      slug: body.slug,
      kind: body.kind,
      locationHint: body.locationHint ?? "",
      active: true,
    })
    .run();
  return c.json({ id: Number(result.lastInsertRowid) }, 201);
});

app.delete("/api/boards/:id", (c) => {
  const id = Number(c.req.param("id"));
  db.delete(companyBoards).where(eq(companyBoards.id, id)).run();
  return c.json({ ok: true });
});

app.post("/api/jobs/import", async (c) => {
  try {
    const body = await c.req.json();
    const result = importCapturedJob(body);
    return c.json(result, result.created ? 201 : 200);
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "import failed" }, 400);
  }
});

app.post("/api/refresh", async (c) => {
  const result = await refreshAll();
  return c.json(result);
});

app.post("/api/rescore", (c) => {
  rescore();
  return c.json({ ok: true });
});

app.get("/api/jobs", (c) => {
  const status = c.req.query("status");
  const region = c.req.query("region");
  const q = c.req.query("q");
  const page = Math.max(1, Number(c.req.query("page") ?? "1"));
  const perPage = 40;

  const rows = db.select().from(jobs).orderBy(desc(jobs.score)).all();
  let filtered = rows;
  if (status) filtered = filtered.filter((j) => j.status === status);
  else filtered = filtered.filter((j) => j.status === "queued");
  if (region) filtered = filtered.filter((j) => j.region === region);
  if (q) {
    const needle = q.toLowerCase();
    filtered = filtered.filter(
      (j) => j.title.toLowerCase().includes(needle) || j.company.toLowerCase().includes(needle),
    );
  }
  const total = filtered.length;
  const slice = filtered.slice((page - 1) * perPage, page * perPage).map((j) => ({
    ...j,
    description: "",
  }));
  return c.json({ total, page, jobs: slice });
});

app.get("/api/jobs/stats", (c) => {
  const rows = db.select().from(jobs).all();
  const counts: Record<string, number> = {};
  for (const j of rows) counts[j.status] = (counts[j.status] ?? 0) + 1;
  return c.json({
    total: rows.length,
    counts,
    hardSkipped: rows.filter((j) => isHardSkip(j.roleFit as "no", j.hiringGeo as "unknown")).length,
  });
});

app.get("/api/jobs/:id", (c) => {
  const id = Number(c.req.param("id"));
  const job = db.select().from(jobs).where(eq(jobs.id, id)).all()[0];
  if (!job) return c.json({ error: "not found" }, 404);
  return c.json(job);
});

app.post("/api/jobs/:id/packet", async (c) => {
  const id = Number(c.req.param("id"));
  const body = (await c.req.json().catch(() => ({}))) as { tailorResume?: boolean };
  try {
    const packet = await buildPacket(id, Boolean(body.tailorResume));
    return c.json(packet);
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "packet failed" }, 400);
  }
});

app.patch("/api/jobs/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const body = (await c.req.json()) as { status?: string; notes?: string };
  const current = db.select().from(jobs).where(eq(jobs.id, id)).all()[0];
  if (!current) return c.json({ error: "not found" }, 404);
  const patch: { status?: string; notes?: string; appliedAt?: string } = {};
  if (body.status) patch.status = body.status;
  if (body.notes !== undefined) patch.notes = body.notes;
  if (body.status === "applied" && !current.appliedAt) patch.appliedAt = new Date().toISOString();
  db.update(jobs).set(patch).where(eq(jobs.id, id)).run();
  return c.json(db.select().from(jobs).where(eq(jobs.id, id)).all()[0]);
});
