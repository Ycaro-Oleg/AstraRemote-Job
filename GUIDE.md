# How to use AstraRemote-Job

This is your layoff-insurance cockpit. It finds roles that match a mid-level Rails/backend profile in Brazil, skips jobs that require US work authorization or an EU/UK permit, prepares the packet, and fills the repeated ATS fields. You still click **Submit** on the company site.

Hunting does not use an LLM. The model is only for cover letters, “why this company”, and the optional tailored resume.

There is no LinkedIn crawl and no fake LinkedIn account. LinkedIn/Indeed/Wellfound/Glassdoor jobs enter the tool when **you** open the posting and click **Enviar para Astra** on the page. Public feeds (We Work Remotely, Remotive, RemoteOK, Himalayas, Arbeitnow, Jobicy) are polled automatically.

## What a good week looks like

Target: about **100 applications in 7 days** without turning into spam.

That is **15–20 Submit clicks per weekday**, roughly 8–10 hours total if the filler is working. Quality still matters: only jobs that survived the hard filters (title, seniority, work-auth) reach the queue.

Daily loop:

1. Start the local server.
2. Refresh boards (or let the scheduler do it).
3. Open the daily queue (top 20 by score).
4. For each row: Apply → glance at the packet → optional “Tailor resume” → Fill → **you** Submit → mark Applied.
5. Skip anything that looks wrong; restore later if the filter was too aggressive.

Do not apply to US-auth-only jobs “just in case”. That is wasted clicks from Fortaleza.

## 1. Install (once the apps exist)

Requirements: Node 22+, pnpm, Chrome, this repo.

```bash
cd ~/PortfolioProjects/AstraRemote-Job
corepack enable && corepack prepare pnpm@9.15.0 --activate
pnpm install
cp .env.example .env
# edit .env — see API keys below (optional; hunting works with no key)
pnpm dev
```

UI and API: `http://127.0.0.1:8790`

Load the extension:

1. Chrome → `chrome://extensions`
2. Enable **Developer mode**
3. **Load unpacked** → `apps/extension` (or `apps/extension/dist` if the build outputs there)
4. Pin it. The side panel is the packet during an apply session.

Leave the server running while you apply. The extension talks only to localhost.

## 2. Connect an API key (cover letters + resume tailor)

Hunting works with **no key**. Packet generation and resume tailoring need one.

Put secrets only in `.env`. Never commit them. Never paste them into the extension.

```env
LLM_PROVIDER=deepseek
LLM_API_KEY=sk-...
LLM_MODEL=deepseek-chat
```

| Variable | Meaning |
|---|---|
| `LLM_PROVIDER` | `deepseek` \| `openrouter` \| `xai` \| `openai_compatible` |
| `LLM_API_KEY` | Bearer token from that provider |
| `LLM_MODEL` | Model id |
| `LLM_BASE_URL` | Optional. Required for `openai_compatible`. Overrides the provider default. |

If the key is missing or a call fails, the app uses a template cover letter and the master resume. Apply still works.

### Option A — DeepSeek (default, cheapest that is actually reliable)

DeepSeek is pay-as-you-go and very cheap. A hundred short cover letters plus a handful of resume tailors is cents to a few dollars, not tens.

1. Open [https://platform.deepseek.com](https://platform.deepseek.com) (this is **not** chat.deepseek.com).
2. Sign up with email (or phone / Google / GitHub if offered).
3. Open **API Keys** → create a key → copy it immediately (shown once).
4. Open **Billing / Top up**. New accounts sometimes get a small promo credit; if not, a $2–$5 top-up lasts a long time at these volumes.
5. In `.env`:

```env
LLM_PROVIDER=deepseek
LLM_API_KEY=paste-the-key
LLM_MODEL=deepseek-chat
```

Default base URL (you do not need to set it): `https://api.deepseek.com`

If `deepseek-chat` is renamed in their console, copy the current chat model id from their models page and set `LLM_MODEL`.

### Option B — OpenRouter (closest thing to “free models”)

There is no serious, unlimited free API that will write 100 decent cover letters a week. OpenRouter is the practical free/cheap playground:

1. Open [https://openrouter.ai](https://openrouter.ai) → sign in (GitHub is fine).
2. Keys → **Create key**.
3. Models → filter **Free**. Free ids usually end with `:free` (they change; pick a current one in the dashboard).
4. Free models are rate-limited and sometimes disappear. Fine for testing; for a volume week use DeepSeek or a paid OpenRouter model.

```env
LLM_PROVIDER=openrouter
LLM_API_KEY=sk-or-...
LLM_MODEL=deepseek/deepseek-chat:free
```

If the `:free` id 404s, open the OpenRouter models page and paste a live free (or cheap) id. Default base URL: `https://openrouter.ai/api/v1`

### Option C — Muse Spark (Meta Model API)

If you already have a Meta Model API or EmpirioLabs key for Muse Spark:

```env
LLM_PROVIDER=openai_compatible
LLM_API_KEY=your-key
LLM_BASE_URL=https://api.developer.meta.com/v1
LLM_MODEL=muse-spark-1.3
```

Confirm the live base URL and model id in the Meta / EmpirioLabs dashboard before saving. Contributor-tier ids are the cheap ones when offered.

### Option D — xAI (SpaceXAI / Grok)

If you already have an xAI key:

1. [https://console.x.ai](https://console.x.ai) → create a key.
2. `.env`:

```env
LLM_PROVIDER=xai
LLM_API_KEY=xai-...
LLM_MODEL=grok-4.5
```

Base URL: `https://api.x.ai/v1`

### Which one should you actually use?

- **Volume week (100 apps):** DeepSeek. Cheap, stable, good enough for cover letters and resume reordering.
- **Trying the tool tonight:** OpenRouter `:free` model.
- **You already pay for xAI or Muse Spark:** use that key; do not pay twice.

Do not put the key in Chrome storage, screenshots, or git.

## 3. Fill your profile (once)

Open the Profile page. This is the vault every form is filled from.

Required:

- Name, email (`ycaro.oleg.job@gmail.com` unless you change it), phone, city (Fortaleza), country (Brazil)
- LinkedIn, GitHub, site
- Current title and company
- Years of experience, years of Ruby, years of Rails
- Work setup: based in Brazil, needs US sponsorship, available as remote contractor / EOR
- Notice period
- Salary target (you type it; the tool does not invent one)
- Skills and target titles
- Master resume: structured sections (summary, experience bullets, skills, education, projects) **and** the PDF that ships when you do not tailor

Canonical answers to keep in the vault (you will type these once):

| Question | Intended answer (edit if wrong) |
|---|---|
| Authorized to work in the US / need sponsorship? | Yes, I would need sponsorship for a US employee role. I work remotely from Brazil as a contractor or via EOR. |
| Willing to relocate? | No. Remote from Brazil. |
| Right to work in the EU/UK? | No. Remote contractor / EOR only. |
| How did you hear about us? | Company careers page |
| Start date | After notice period (fill the number on Profile) |
| Gender / race / veteran | Decline to self-identify |
| LinkedIn / GitHub / website | From profile links |

Save. After changing skills or titles, rescore existing jobs from the UI.

## 4. Boards (the hunt)

Automatic polling uses **public feeds and APIs only**:

| Source | How |
|---|---|
| Greenhouse / Lever / Ashby | Company job-board JSON |
| Remotive | Official `GET /api/remote-jobs?category=software-dev` |
| RemoteOK | Official `GET /api?tag=dev` (and `ruby`) |
| We Work Remotely | Official RSS (`backend` + `programming`) |
| Himalayas | Official search API (`rails`, `ruby backend`) |
| Arbeitnow | Official job-board API |
| Jobicy | Official `v2/remote-jobs` |

Seed list: `data/boards.seed.json`. Duplicate roles across boards collapse to one row (company+title fingerprint). A Greenhouse/Lever/Ashby apply URL wins over an aggregator link.

Add a company ATS board:

1. Open its careers page.
2. `job-boards.greenhouse.io/gitlab` → ATS `greenhouse`, slug `gitlab`.
3. `jobs.lever.co/toptal` → `lever` / `toptal`.
4. `jobs.ashbyhq.com/linear` → `ashby` / `linear`.
5. Add it in the UI.

**LinkedIn, Indeed, Wellfound, Glassdoor** have no public jobs API. A fake account is not a solution (ban risk, ToS, and it still does not give you a stable feed). With the extension loaded, open the job on your **real** account and click **Enviar para Astra**. If the description contains a Greenhouse/Lever/Ashby URL, that becomes the apply link.

Refresh: button in the UI, or the in-process scheduler every few hours while `pnpm dev` is running.

## 5. Queue

After refresh, jobs are classified:

**Dropped (never in the queue):** wrong title, intern/staff+/director, US-auth-only, EU/UK-permit-only, frontend/mobile/ML/sales-only.

**Queued:** top **20** by score among what remains, that you have not applied to or skipped.

Score (0–100) rewards Rails titles, skill hits as a **count** (not a ratio), remote-worldwide, marketplace boards, and recency. Ambiguous work-auth is kept but penalized.

Filters: status, region, kind, search. **Show skipped** exists so you can restore a false skip.

Raise the daily cap on a volume day. Do not raise it by applying to skipped auth jobs.

## 6. Apply session (the 3-minute loop)

1. Click **Apply** on a queue row.
2. Read the generated cover letter in the side panel. Edit if it is generic. Keep it true.
3. Optional: **Tailor resume for this JD**. Preview the diff. Accept or reject. Reject → master PDF.
4. Chrome opens the company form. Click **Fill**. Check highlighted empty fields (custom questions).
5. Attach the PDF if the file input did not take it (the panel shows which file).
6. **You** click Submit.
7. Click **Mark applied** in the side panel.

If the ATS is not Greenhouse/Lever/Ashby, Fill is a no-op and you paste from the panel.

Never let the extension submit. If a future change auto-submits, that is a bug.

## 7. Resume tailor (optional, per job)

What it may do: reorder bullets, shorten, rephrase, put JD keywords that are **already true** higher, tweak the summary.

What it must not do: add employers, titles, dates, metrics, or skills you do not have.

The master JSON is the source of truth. The PDF is a render. The master is never overwritten. If the model returns a fact that is not in the master, that output is discarded and the master PDF is used.

Use it on roles you actually want. Skip it on marketplace “join our network” forms.

## 8. Tracking

Statuses: `new` → `queued` → `applying` → `applied` → `interviewing` | `offer` | `rejected` | `skipped`.

Notes: recruiter name, interview dates, referral. Applied rows stay after the posting disappears from the board.

## 9. Volume week playbook

Sunday: refresh, skim skipped, add any new Rails/marketplace boards, confirm `.env` key works with one test cover letter.

Weekdays: two blocks (e.g. 45 minutes morning, 45 minutes evening). Each block: 8–10 Submit clicks. Queue is already ranked — do not re-research every company.

Stop applying to a company after one relevant role unless they have two clearly different teams.

Marketplace apps (Toptal, Turing, Andela, Deel, Remote.com) are often longer and higher expected value. Do those when you are fresh; use the remaining queue slots for straightforward Greenhouse forms.

## 10. Troubleshooting

| Symptom | What to do |
|---|---|
| Extension side panel: cannot reach API | Start `pnpm dev`. Confirm `http://127.0.0.1:8790/up`. |
| Cover letters are the template | `.env` key missing, wrong, or provider down. Hunting still works. |
| Tailored resume rejected | Model invented a fact. Use master PDF. If it happens a lot, switch provider/model. |
| Too few jobs in the queue | Add boards. Check that filters are not skipping Rails titles you care about. |
| Too much junk | Tighten titles on Profile. Skip more aggressively. Do not turn off work-auth skip. |
| File input did not attach | Download/open the PDF from the panel and attach manually. |
| Board fetch failed | One board’s `last_error` is fine. Fix the slug or disable that board. |
| Chrome blocked the extension on the ATS page | Content-script matches; reload the unpacked extension after pulls. |
| No “Enviar para Astra” on LinkedIn | Reload the unpacked extension. The server must be running. Use your real LinkedIn session. |

## 11. Things this tool will not do

- Fake LinkedIn/Indeed accounts, crawlers, or Easy Apply bots
- Submit the form for you
- Bypass captcha
- Invent resume experience
- Host this on the public internet

LinkedIn/Indeed/Wellfound/Glassdoor still work via **Enviar para Astra** on a page you opened. The 100/week target is **you** submitting filled forms, not a spray bot.
