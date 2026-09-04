# AstraRemote-Job design

Date: 2026-09-03  
Repo: `github.com/Ycaro-Oleg/AstraRemote-Job`  
Owner: Ycaro Pires (Fortaleza, Brazil) — personal tool, single user, localhost only.

## Problem

Ycaro needs layoff insurance: apply to a large number of compatible roles quickly without retyping the same ATS fields, without LinkedIn/Workday bots, and without spraying US-auth-only jobs that will auto-reject a Brazil-based engineer.

Success: about 100 applications in a week, each submitted by him, each from a posting that survived title + seniority + work-auth filters. The tool finds, ranks, prepares the packet, and fills the form. He clicks Submit.

## Non-goals (v1)

- Auto-Submit, captcha solving, unattended apply
- LinkedIn, Indeed, Glassdoor, Wellfound, Workday clients
- RemoteOK / We Work Remotely (locked out of v1)
- Multi-user, auth, hosting
- Email/Slack digest
- Rewriting the resume on every job by default
- LLM classification of every posting on refresh
- Editing `~/PortfolioProjects/JobHunter` (reference only)

## Users and target hunt

One user. Profile facts the product depends on:

- Mid-level backend / Rails (Coreplan; public-sector integrations; side projects Kaerus, Verdikt, Rubric, Omarchy Tetris)
- Based in Brazil, fluent English, needs US visa sponsorship for employee roles
- Available as remote contractor or via EOR (Deel and similar)
- Hunt: Rails/backend remote (EU, US-remote, remote-first) **plus** LatAm-friendly marketplaces (Toptal, Turing, Andela, Deel, Remote.com, and boards marked `marketplace`)

Hard skip: US-auth-only postings **and** EU/UK work-permit-only postings.

## Architecture

TypeScript monorepo. One language so ATS field maps, `Job`, `Profile`, and fetchers are shared between the server and the Chrome extension.

```
packages/core      domain library, no HTTP, no Chrome APIs
apps/server        one Node process: Hono + SQLite + static UI + in-process scheduler
apps/extension     Chrome MV3: side panel + content scripts
data/              seed boards, later SQLite file (gitignored)
```

Package manager: pnpm workspaces. Runtime: `pnpm dev` starts `apps/server` on `http://127.0.0.1:8790`. The extension calls that origin. No separate worker process. Refresh is `POST /api/refresh` plus an in-process interval (default 6 hours) while the server is up.

JobHunter’s Greenhouse/Lever/Ashby fetcher idea is reimplemented in `packages/core`. That repo is not a dependency and must not be modified.

### Why this stack

The hard software is detecting an ATS page and filling it, plus sharing types with the queue. That is TypeScript. Rails would duplicate ATS maps across languages for a single-user local tool. An extension-only app cannot honestly poll ~150 boards or hold full JDs. Playwright auto-submit is brittle and looks like a bot; filling the user’s real Chrome tab is the reliable path.

### Process split

| Package | Responsibility |
|---|---|
| `packages/core` | Types, board fetchers, work-auth + title classifiers, scorer, packet generator, resume tailor + fact check, PDF render input |
| `apps/server` | SQLite schema, REST, queue UI, profile editor, scheduler, `.env` LLM adapter |
| `apps/extension` | Open apply URL, side panel packet, Fill, Mark applied, Greenhouse/Lever/Ashby DOM maps |

The side panel fetches packet JSON from the API. It does not embed the API key.

## Data model

SQLite via Drizzle + `better-sqlite3`. Four tables. No daily-queue table, no apply-history table.

### `profiles` (exactly one row)

- Identity: `name`, `email`, `phone`, `city`, `country`, `linkedinUrl`, `githubUrl`, `websiteUrl`
- Work: `currentTitle`, `currentCompany`, `yearsExperience`, `yearsRuby`, `yearsRails`, `noticePeriodDays`, `salaryTarget` (free text; user-supplied)
- Constraints: `basedIn` (`BR`), `needsUsSponsorship` (`true`), `availableAs` JSON array (`contractor`, `eor`)
- Hunt: `skills` JSON string[], `targetTitles` JSON string[], `targetKeywords` JSON string[]
- Vault: `answers` JSON object, keys listed in “Canonical answers”
- Resume master: `resume` JSON (`ResumeDocument`, below), `resumePdfPath` text

### `answers` keys (canonical)

`firstName`, `lastName`, `fullName`, `email`, `phone`, `city`, `country`, `linkedin`, `github`, `website`, `currentCompany`, `currentTitle`, `yearsExperience`, `yearsRuby`, `yearsRails`, `needsSponsorship`, `sponsorshipExplanation`, `willingToRelocate`, `rightToWorkEu`, `howHeard`, `startDate`, `demographics` (`decline`)

`whyThisCompany` is **not** stored on the profile. It is generated per job.

### `resume` JSON (`ResumeDocument`)

```ts
type ResumeBullet = { id: string; text: string; keywords: string[] };
type ResumeExperience = {
  id: string;
  company: string;
  title: string;
  start: string; // YYYY-MM
  end: string | "present";
  bullets: ResumeBullet[];
};
type ResumeDocument = {
  summary: string;
  skills: string[];
  experience: ResumeExperience[];
  education: { school: string; degree: string; end: string; gpa?: string }[];
  projects: { name: string; url?: string; text: string }[];
  languages: { name: string; level: string }[];
};
```

The PDF is a render of this document. The JSON is the source of truth.

### `company_boards`

- `name`, `ats` (`greenhouse` | `lever` | `ashby`), `slug`, `kind` (`rails` | `marketplace` | `remote_first`)
- `active` boolean, `locationHint` text
- `lastFetchedAt`, `lastError` (nullable)
- Unique `(ats, slug)`

Seed: `data/boards.seed.json`.

### `jobs`

- `companyBoardId`, `externalId`, unique `(companyBoardId, externalId)`
- `ats`, `company`, `title`, `location`, `remote` boolean
- `url` (listing), `applyUrl` (form; fall back to `url`)
- `description` text, `postedAt` nullable
- `region` (`europe` | `us` | `remote` | `other`)
- `hiringGeo` (`worldwide` | `us_auth_only` | `eu_permit_only` | `unknown`)
- `roleFit` (`rails` | `backend` | `fullstack` | `marketplace` | `no`)
- `score` float 0–100
- `status` (`new` | `queued` | `applying` | `applied` | `interviewing` | `offer` | `rejected` | `skipped`)
- `queuedOn` date nullable (the local calendar day it entered the daily cap)
- `coverLetter`, `whyThisCompany` text nullable
- `tailoredResumeJson` JSON nullable, `tailoredResumePdfPath` text nullable
- `appliedAt` nullable, `notes` text nullable

Skipped auth/title jobs are stored with `status = skipped` so the user can restore them. They are not deleted.

## Discovery

### Sources (v1)

Public JSON only:

- Greenhouse: `GET https://boards-api.greenhouse.io/v1/boards/{slug}/jobs?content=true`
- Lever: `GET https://api.lever.co/v0/postings/{slug}?mode=json`
- Ashby: `GET https://api.ashbyhq.com/posting-api/job-board/{slug}`

User-Agent: a descriptive local client string (e.g. `AstraRemote-Job/0.1 (personal; localhost)`). Timeout 20s. One board failure must not abort the rest; set `lastError` and continue.

### Mapping into `jobs`

Each fetcher returns `RawPosting { externalId, title, company, location, remote, url, applyUrl, description, postedAt }`. Upsert on `(companyBoardId, externalId)`. Descriptions may be HTML; store text extracted with tags stripped, keep enough for scoring (cap 50k chars).

If a posting disappears from a board: do not delete rows with status `applied` or later; mark still-`new`/`queued` rows that vanished as `skipped` with note `posting_removed`.

### Refresh

`POST /api/refresh` runs all active boards sequentially with a small delay (100–200ms) to avoid bursting. Scheduler: every 6 hours while the process lives. After all boards: classify + score every job that is not `applied`/`interviewing`/`offer`/`rejected`; then rebuild the daily queue.

## Filters and scoring

All classifiers are keyword/regex. No LLM on refresh.

### Title keep

Normalize title to lowercase. **Keep** if any:

- `ruby` or `rails`
- `backend`, `back-end`, `back end`
- `full stack`, `fullstack`, `full-stack`
- `software engineer`, `software developer`, `swe` as a token
- For `kind = marketplace` boards only: `apply to join`, `talent network`, `developer network`, `join our`

### Title skip (even if keep matched)

Skip (`roleFit = no`) if title matches:

- `staff`, `principal`, `distinguished`, `fellow`, `director`, `vp `, `vice president`, `head of`, `chief `
- `intern`, `internship`, `apprentice`
- `ios`, `android`, `mobile engineer`
- `data scientist`, `machine learning`, ` ml `, `research scientist`
- `front-end`, `frontend`, `front end` **unless** full-stack also matched
- `sales`, `recruiter`, `account executive`, `customer success`, `designer`, `product manager`

### Role fit (among kept)

- `rails` if title or description (first 2k chars) contains `ruby` or `rails`
- else `backend` if backend tokens in title
- else `fullstack` if full-stack tokens in title
- else `marketplace` if board kind is marketplace
- else `backend` if “software engineer/developer” kept
- else `no`

### Work-auth (`hiringGeo`)

Run on `title + location + description` lowercase.

**US-auth-only** if any:

- `authorized to work in the united states` / `usa` / `u.s.`
- `eligibility to work in the united states`
- `without visa sponsorship` / `without sponsorship`
- `we do not sponsor` / `we don't sponsor` / `no sponsorship`
- `must have us work authorization` / `u.s. work authorization`
- `us person` / `u.s. person`
- `citizenship or permanent residency` / `green card required`

**EU-permit-only** if any:

- `right to work in the uk` / `united kingdom` / `ireland`
- `right to work in the eu` / `european union` / `eea`
- `must have` + (`eu` | `uk` | `eea`) + (`passport` | `work permit` | `right to work`)
- `valid german work` / `netherlands work permit` and similar `work permit` + EU country

If both worldwide-hire phrases **and** a skip phrase appear, **skip wins**.

**Worldwide** if no skip matched and any of: `remote worldwide`, `work from anywhere`, `hire anywhere`, `anywhere in the world`, `no geographic restriction`.

Else `unknown`.

Hard skip from the queue: `hiringGeo` in `us_auth_only`, `eu_permit_only` **or** `roleFit = no`. Those rows get `status = skipped` (unless already applied/interviewing/offer/rejected).

### Region

- `remote` if location or title contains `remote`
- `europe` if EU/UK/EEA country hints (same list idea as JobHunter)
- `us` if US hints
- else `other`

### Score (0–100), integer after round

```
title_points:
  rails/ruby in title: 30
  else backend in title: 22
  else marketplace keep on marketplace board: 16
  else fullstack or software engineer keep: 14
  else: 8

skill_points: min(25, 5 * number of profile.skills whose lowercase form
              appears in title+description)

remote_points:
  worldwide phrases: 15
  remote and hiringGeo != us_auth_only/eu_permit_only: 10
  else: 0

marketplace_bonus: 10 if board.kind == marketplace
recency:
  postedAt within 7 days: 10
  within 30 days: 5
  else: 0
auth_penalty: -8 if hiringGeo == unknown else 0

score = clamp(0, 100, sum)
```

Skill matching is **count**, not ratio. A long skills list must not dilute the score.

### Daily queue

Among jobs where `status` is `new` or `queued`, not hard-skipped, `queuedOn` is today or null:

1. Sort by `score` desc, then `postedAt` desc.
2. Take `N` (default 20, user-configurable 10–50), **at most 2 jobs per company**, then fill remaining slots without the cap so a volume day still fills.
3. Set those to `queued` and `queuedOn = today`.
4. Rebuilding the queue first returns untouched `queued` rows to `new`, then assigns today’s N. In-progress `applying` and later statuses are left alone. A job that falls out of the top N is not lost; it can re-enter tomorrow.

The Queue page default view: `status = queued` ordered by score.

## Apply loop

### Packet

`POST /api/jobs/:id/packet` with `{ tailorResume: boolean }`:

1. Set status `applying` if it was `new` or `queued`.
2. Generate cover letter (LLM if key present, else template).
3. Generate `whyThisCompany` the same way (short, 2–4 sentences).
4. If `tailorResume`: run tailor; on failure or fact-check reject, keep master.
5. Persist letter + why + optional tailored paths.
6. Return packet JSON: vault answers, letter, why, resume file URL(s), job metadata.

Template cover letter (no LLM): greeting, headline, up to 3 keyword-overlapping bullets from the master resume, matched skills sentence, sign-off. Same idea as JobHunter, implemented here.

LLM cover letter: 150–220 words, true, specific to the JD, no invented metrics, English.

### Resume tailor (opt-in)

Input: master `ResumeDocument` + job title/company/description.  
Output: a new `ResumeDocument` whose:

- `experience[].company`, `title`, `start`, `end` are **equal** to the master (same set of jobs; no extras, no missing employers unless the user later allows dropping a role — v1 **may drop a whole role** only if the company/title/dates still exist in the master for remaining roles; it may not edit company/title/dates strings)
- Bullet `text` may change; a fact-check walks numbers and proper nouns: every number and every company/product name in the new bullet must appear in the master document text
- `education` unchanged
- `skills` must be a subset of master skills plus JD terms that already appear in master summary/bullets/skills

If fact-check fails: discard, return `{ used: "master", reason }`.

If it passes: render PDF to `data/resumes/generated/{jobId}.pdf`, save JSON + path.

Master JSON and master PDF are never overwritten.

### Fill (extension)

Content scripts match:

- `https://boards.greenhouse.io/*`
- `https://job-boards.greenhouse.io/*`
- `https://*.greenhouse.io/*`
- `https://jobs.lever.co/*`
- `https://jobs.ashbyhq.com/*`

Fill maps vault keys → inputs by `name`, `id`, `autocomplete`, then label text. Known keys: first/last name, email, phone, LinkedIn, GitHub, website, city, country, resume file, cover letter textarea.

Resume file: fetch the PDF from `http://127.0.0.1:8790/api/jobs/:id/resume.pdf`, build a `File`, assign via `DataTransfer` onto the file input, dispatch `change`. If that throws, the side panel shows “attach this file” with the same URL.

The extension **must not** click buttons whose text/name is Submit / Apply / Send application.

Unknown ATS: no DOM writes; side panel still offers copy buttons.

After the user submits, **Mark applied** → `PATCH /api/jobs/:id` `{ status: "applied" }` which sets `appliedAt` if empty.

### Server routes (v1)

- `GET /up` health
- `GET/PUT /api/profile`
- `GET/POST /api/boards`, `DELETE /api/boards/:id`, `POST /api/boards/:id/refresh`
- `POST /api/refresh`
- `POST /api/rescore`
- `GET /api/jobs` query: `status`, `region`, `kind`, `q`, `page`
- `GET /api/jobs/:id`
- `POST /api/jobs/:id/packet`
- `GET /api/jobs/:id/resume.pdf` (tailored if accepted, else master)
- `PATCH /api/jobs/:id` status + notes
- Static UI for `/`, `/jobs/:id`, `/profile`, `/boards`

CORS: allow the Chrome extension id once known; in dev, allow `chrome-extension://*` from localhost only. Bind `127.0.0.1`, not `0.0.0.0`.

## LLM adapter

Server-only. `packages/core` defines `LlmClient.complete({ system, user, jsonSchema?: object }): Promise<string>`.

`apps/server` implements it from env:

| `LLM_PROVIDER` | Default base | Default model |
|---|---|---|
| `deepseek` | `https://api.deepseek.com` | `deepseek-chat` |
| `openrouter` | `https://openrouter.ai/api/v1` | user-set (often a `:free` id) |
| `xai` | `https://api.x.ai/v1` | `grok-4.5` |
| `openai_compatible` | `LLM_BASE_URL` required | `LLM_MODEL` required |

All speak OpenAI chat-completions (`/chat/completions`). Timeout 60s. On error, callers use the template path.

The extension never sees `LLM_API_KEY`.

## UI

Vite + React SPA, built into `apps/server` and served as static files by Hono. Three screens:

1. **Queue** — default home. Score, title, company, kind, region, Apply.
2. **Job** — description excerpt, packet, tailor toggle, status, notes.
3. **Profile / Boards** — vault editor; board list with last fetch/error and add form.

Visual style: dense, readable, no marketing. First UI cut is mouse-driven. Keyboard `j`/`k` / `Enter` can wait.

## Errors

- Board fetch fail → `lastError`, continue
- LLM fail → template letter + master resume
- Tailor fact-check fail → master resume + reason shown
- Extension cannot reach API → message to start the server
- Partial fill → highlight empty required-looking fields; never Submit
- File input blocked → manual attach CTA
- Duplicate posting across boards: still one row per board+externalId (same role at two companies is two rows; same role twice on one board is one)

## Testing

- Fetcher unit tests with recorded JSON fixtures under `packages/core/fixtures/{greenhouse,lever,ashby}/`
- Classifier golden cases: at least 8 JD snippets (4 skip US, 2 skip EU, 2 worldwide keep)
- Title skip/keep cases
- Scorer: fixed profile, known job, exact expected number
- Resume tailor: mocked LLM JSON that adds an employer → rejected
- Resume tailor: reordered bullets with same facts → accepted
- API: status transitions `queued → applying → applied`
- Extension: fill helpers against saved HTML fixtures; no live Submit in CI

Network is off in unit tests. Refresh integration tests may use fixtures, not live ATS, in CI.

## Seed profile (implementation)

On first boot, if no profile row exists, insert Ycaro from the public resume (name, email `ycaro.oleg.job@gmail.com`, phone, links, skills, bullets). He edits salary, notice, and answers in the UI. Do not invent salary.

## Implementation order

1. `packages/core` types, classifiers, scorer, fetchers + fixtures
2. `apps/server` SQLite, refresh, queue UI, profile, seed boards
3. Packet template + LLM adapter + optional tailor + PDF
4. Chrome extension fill + side panel
5. Polish: restore skipped, daily cap control, lastError in Boards UI

Each step should be runnable without the later ones (queue without filler is still useful).

## Open decisions (locked)

- Stack: TypeScript, not Rails
- Submit: human
- Hunt core: tool finds and queues (not paste-URL-first)
- v1 sources: Greenhouse, Lever, Ashby only
- EU-permit jobs: skipped
- Resume tailor: opt-in, fact-checked
- LLM default: DeepSeek; adapter also OpenRouter / xAI / generic
- GitHub repo: this one; commits have no `Co-authored-by`
