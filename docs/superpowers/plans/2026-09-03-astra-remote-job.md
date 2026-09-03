# AstraRemote-Job Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a local TypeScript cockpit that polls Greenhouse/Lever/Ashby, hard-skips unworkable jobs, queues the best Rails/backend/marketplace fits, prepares a packet, optionally tailors a truthful resume, and fills ATS forms while Ycaro clicks Submit.

**Architecture:** pnpm monorepo. `packages/core` holds types, fetchers, classifiers, scorer, packet, resume fact-check. `apps/server` is one Hono process (SQLite via Drizzle, Vite React UI, scheduler) on `127.0.0.1:8790`. `apps/extension` is Chrome MV3 (side panel + content scripts). LLM stays server-side.

**Tech Stack:** Node 22, pnpm, TypeScript, Hono, Drizzle, better-sqlite3, Vite, React, Chrome MV3, OpenAI-compatible chat completions (DeepSeek default).

**Spec:** `docs/superpowers/specs/2026-09-03-astra-remote-job-design.md`

## Global Constraints

- Bind `127.0.0.1` only; never `0.0.0.0`.
- Public Greenhouse/Lever/Ashby JSON only; no LinkedIn/Workday/Indeed.
- Extension fills fields and never clicks Submit/Apply/Send.
- Resume tailor may not invent employers, titles, dates, or metrics.
- `LLM_API_KEY` only in `.env`; never in the extension bundle.
- Commits have no `Co-authored-by` trailer.
- Do not modify `~/PortfolioProjects/JobHunter`.
- Default queue cap 20; default LLM provider `deepseek`.
- Port `8790`.

---

### Task 1: Monorepo scaffold

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `packages/core/package.json`, `packages/core/tsconfig.json`, `packages/core/src/index.ts`, `apps/server/package.json`, `apps/server/tsconfig.json`, `apps/extension/package.json`, `apps/extension/tsconfig.json`

**Interfaces:**
- Consumes: nothing
- Produces: workspace names `@astra/core`, `@astra/server`, `@astra/extension`; shared TS `strict` + `bundler` resolution

- [ ] **Step 1: Write workspace files**

Root `package.json` private, packageManager `pnpm@9`, scripts `"dev": "pnpm --filter @astra/server dev"`, `"test": "pnpm --filter @astra/core test"`. `pnpm-workspace.yaml` lists `packages/*` and `apps/*`. `tsconfig.base.json` has `strict: true`, `target: ES2022`, `module: ESNext`, `moduleResolution: bundler`.

- [ ] **Step 2: Verify install**

Run: `cd /home/ycaro/PortfolioProjects/AstraRemote-Job && pnpm install`  
Expected: lockfile created, no err.

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-workspace.yaml tsconfig.base.json pnpm-lock.yaml packages apps
git commit -m "chore: pnpm workspace scaffold"
```

---

### Task 2: Core types, classifiers, scorer

**Files:**
- Create: `packages/core/src/types.ts`, `packages/core/src/classifyTitle.ts`, `packages/core/src/classifyAuth.ts`, `packages/core/src/region.ts`, `packages/core/src/score.ts`, `packages/core/src/index.ts`
- Test: `packages/core/src/classifyAuth.test.ts`, `packages/core/src/classifyTitle.test.ts`, `packages/core/src/score.test.ts`

**Interfaces:**
- Produces:

```ts
export type Ats = "greenhouse" | "lever" | "ashby";
export type BoardKind = "rails" | "marketplace" | "remote_first";
export type HiringGeo = "worldwide" | "us_auth_only" | "eu_permit_only" | "unknown";
export type RoleFit = "rails" | "backend" | "fullstack" | "marketplace" | "no";
export type JobStatus =
  | "new" | "queued" | "applying" | "applied"
  | "interviewing" | "offer" | "rejected" | "skipped";
export type Region = "europe" | "us" | "remote" | "other";

export function classifyAuth(text: string): HiringGeo;
export function classifyTitle(title: string, description: string, kind: BoardKind): RoleFit;
export function regionFor(location: string, title: string): Region;
export function scoreJob(input: {
  title: string;
  description: string;
  postedAt: Date | null;
  hiringGeo: HiringGeo;
  boardKind: BoardKind;
  skills: string[];
}): number; // 0–100, formula in the spec
export function isHardSkip(roleFit: RoleFit, hiringGeo: HiringGeo): boolean;
```

`isHardSkip` is `roleFit === "no" || hiringGeo === "us_auth_only" || hiringGeo === "eu_permit_only"`.

- [ ] **Step 1: Write failing tests** for auth skip (US sponsorship, EU right-to-work), worldwide keep, title skip (staff, intern, frontend-only), Rails keep, scorer count-not-ratio (two extra unused skills must not lower the score).

- [ ] **Step 2: Run tests** — `pnpm --filter @astra/core test` — expect FAIL (modules missing).

- [ ] **Step 3: Implement** using the exact skip phrases and score formula in the spec section “Filters and scoring”.

- [ ] **Step 4: Run tests** — expect PASS.

- [ ] **Step 5: Commit** `feat: classify and score jobs without an LLM`

---

### Task 3: ATS fetchers

**Files:**
- Create: `packages/core/src/fetchers/types.ts`, `packages/core/src/fetchers/greenhouse.ts`, `packages/core/src/fetchers/lever.ts`, `packages/core/src/fetchers/ashby.ts`, `packages/core/src/fetchers/htmlToText.ts`
- Test: `packages/core/src/fetchers/greenhouse.test.ts` (and lever, ashby)
- Create: `packages/core/fixtures/greenhouse/jobs.json`, `packages/core/fixtures/lever/jobs.json`, `packages/core/fixtures/ashby/jobs.json` (trimmed real-shaped JSON)

**Interfaces:**
- Produces:

```ts
export type RawPosting = {
  externalId: string;
  title: string;
  company: string;
  location: string;
  remote: boolean;
  url: string;
  applyUrl: string;
  description: string;
  postedAt: Date | null;
};
export type FetchResult = { postings: RawPosting[] };
export function fetchGreenhouse(slug: string, fetchFn?: typeof fetch): Promise<FetchResult>;
export function fetchLever(slug: string, fetchFn?: typeof fetch): Promise<FetchResult>;
export function fetchAshby(slug: string, fetchFn?: typeof fetch): Promise<FetchResult>;
```

Inject `fetchFn` so tests never hit the network. Strip HTML in descriptions, cap 50_000 chars. User-Agent `AstraRemote-Job/0.1 (personal; localhost)`. Timeout 20s.

- [ ] **Step 1: Fixtures + tests** that parse `id`/`absolute_url` (Greenhouse), `id`/`hostedUrl` (Lever), `id`/`jobUrl` (Ashby).

- [ ] **Step 2: Implement fetchers.**

- [ ] **Step 3: Tests PASS without network.**

- [ ] **Step 4: Commit** `feat: fetch Greenhouse, Lever, and Ashby boards`

---

### Task 4: Server, SQLite, refresh, queue API

**Files:**
- Create: `apps/server/src/db/schema.ts`, `apps/server/src/db/client.ts`, `apps/server/src/seed.ts`, `apps/server/src/refresh.ts`, `apps/server/src/routes.ts`, `apps/server/src/index.ts`
- Test: `apps/server/src/refresh.test.ts`

**Interfaces:**
- Consumes: core fetchers + classifiers + scorer; `data/boards.seed.json`
- Produces: routes from the spec (`GET /up`, profile, boards, refresh, rescore, jobs CRUD/patch, packet stub that returns template letter)

Bind `127.0.0.1:${PORT||8790}`. After refresh: classify, score, skip, then pick top 20 into `queued` for today.

- [ ] **Step 1: Schema** matching spec tables `profiles`, `company_boards`, `jobs`.

- [ ] **Step 2: Seed** boards from JSON + profile row for Ycaro (no invented salary).

- [ ] **Step 3: Refresh** with injected fetchers; one board error sets `lastError` and continues.

- [ ] **Step 4: Commit** `feat: local API refresh and job queue`

---

### Task 5: Queue / profile / boards UI

**Files:**
- Create: `apps/server/ui/` Vite React app with Queue, Job, Profile, Boards screens, served by Hono from the built (and in-dev proxied) assets.

**Interfaces:**
- Consumes: `/api/jobs`, `/api/profile`, `/api/boards`, `/api/refresh`
- Produces: mouse-driven UI; Apply calls packet endpoint and opens `applyUrl`

- [ ] **Step 1: Queue list** with score, filters, Apply.

- [ ] **Step 2: Profile editor + Boards add/refresh/lastError.**

- [ ] **Step 3: `pnpm dev` shows jobs after refresh (live or fixture).**

- [ ] **Step 4: Commit** `feat: queue UI on localhost:8790`

---

### Task 6: LLM adapter, template + LLM packet, optional resume tailor

**Files:**
- Create: `packages/core/src/llm.ts` (interface only), `packages/core/src/packet.ts`, `packages/core/src/resumeTailor.ts`, `packages/core/src/resumeFactCheck.ts`, `packages/core/src/resumePdf.ts`
- Create: `apps/server/src/llmClient.ts`
- Test: `packages/core/src/resumeFactCheck.test.ts`, `packages/core/src/packet.test.ts`

**Interfaces:**
- Produces:

```ts
export interface LlmClient {
  complete(input: { system: string; user: string; jsonSchema?: object }): Promise<string>;
}
export function templateCoverLetter(profile: Profile, job: { title: string; company: string; description: string }): string;
export function factCheckResume(master: ResumeDocument, candidate: ResumeDocument): { ok: true } | { ok: false; reason: string };
```

Env mapping as in the spec. Missing key → template path, never throw to the UI.

- [ ] **Step 1: Fact-check tests** (invented employer rejected; reordered bullets accepted).

- [ ] **Step 2: Implement tailor + PDF render of `ResumeDocument`.**

- [ ] **Step 3: `POST /api/jobs/:id/packet`.**

- [ ] **Step 4: Commit** `feat: packet generation and optional resume tailor`

---

### Task 7: Chrome extension

**Files:**
- Create: `apps/extension/manifest.json`, `apps/extension/src/background.ts`, `apps/extension/src/sidepanel.ts`, `apps/extension/src/sidepanel.html`, `apps/extension/src/content/greenhouse.ts`, `apps/extension/src/content/lever.ts`, `apps/extension/src/content/ashby.ts`, `apps/extension/src/fill.ts`
- Test: `apps/extension/src/fill.test.ts` against HTML fixtures

**Interfaces:**
- Consumes: `GET /api/jobs/:id`, `POST /api/jobs/:id/packet`, `PATCH /api/jobs/:id`, `GET /api/jobs/:id/resume.pdf`
- Produces: `fill(document, answers)` that never clicks Submit; file input via DataTransfer with fallback message

Matches from the spec. `host_permissions`: `http://127.0.0.1:8790/*`.

- [ ] **Step 1: Fill helpers + tests** on fixture HTML.

- [ ] **Step 2: Side panel Fill + Mark applied.**

- [ ] **Step 3: Commit** `feat: Chrome extension fills Greenhouse, Lever, Ashby`

---

### Task 8: Guide pass and seed hardening

**Files:**
- Modify: `GUIDE.md` if scripts/paths differ from reality; `data/boards.seed.json` disable slugs that 404 on first live refresh.

- [ ] **Step 1: Live refresh once** (not in CI). Deactivate failing slugs.

- [ ] **Step 2: Walk GUIDE.md against the running app; fix drift.**

- [ ] **Step 3: Commit** `docs: align guide with shipped commands`

---

## Spec coverage

| Spec section | Task |
|---|---|
| Architecture / stack | 1 |
| Filters and scoring | 2 |
| Discovery fetchers | 3 |
| Data model, refresh, queue | 4 |
| UI screens | 5 |
| Packet, LLM, tailor, PDF | 6 |
| Extension fill, no Submit | 7 |
| Errors `lastError`, restore skipped | 4–5 |
| GUIDE / API keys | 6 + 8 |
| Non-goals | all tasks omit them |

## Execution

Implement inline in this repo (no JobHunter edits). Start at Task 1 and continue through Task 5 before the extension if time is split across sessions — a working queue on :8790 is already useful.
