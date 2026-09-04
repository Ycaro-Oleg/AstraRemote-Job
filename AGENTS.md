# AstraRemote-Job — agent notes

Personal apply cockpit for Ycaro Pires (Fortaleza, Brazil). Local-only. He clicks Submit.

## Read first

| If you are… | Open |
|---|---|
| Implementing or changing behavior | `docs/superpowers/specs/2026-09-03-astra-remote-job-design.md` |
| Explaining how to use it, API keys, or the 100-apps week | `GUIDE.md` |
| Adding companies to poll | `data/boards.seed.json` |

JobHunter at `~/PortfolioProjects/JobHunter` is a **reference only**. Do not edit it. Reimplement fetchers here.

## Product facts

- Target: mid-level Rails/backend remote + LatAm-friendly marketplaces.
- Hard-skip US-auth-only and EU/UK work-permit-only jobs.
- User submits every application. The Chrome extension fills; it never clicks Submit.
- One resume master (structured JSON + PDF render). Tailored PDF is opt-in per job and may only reorder/rephrase facts already in the master.
- LLM is for packet text and optional resume tailor. Refresh/score/filter stay keyword-based.
- Default model adapter: DeepSeek (`LLM_PROVIDER=deepseek`). Also OpenRouter, xAI, or any OpenAI-compatible base URL. Key lives in `.env`, never in the extension bundle.

## Guardrails

- Public feeds only for auto-poll (Greenhouse, Lever, Ashby, Remotive, RemoteOK, WWR, Himalayas, Arbeitnow, Jobicy). LinkedIn/Indeed/Wellfound/Glassdoor enter via user capture, never via a crawler or fake account.
- Commits have no `Co-authored-by` trailer.
- Do not add LinkedIn, Workday, Indeed, or Glassdoor clients.
- Do not add captcha solving or unattended form submit.
- Do not invent employers, titles, dates, or metrics on the resume.

## Layout

```
packages/core     domain: types, fetchers, filters, scorer, packet, resume tailor
apps/server       one Node process: Hono API + queue UI + scheduler + SQLite
apps/extension    Chrome MV3: side panel + Greenhouse/Lever/Ashby content scripts
```

Server default: `http://127.0.0.1:8790`.
