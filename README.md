# AstraRemote-Job

Local cockpit that finds Rails/backend and LatAm-marketplace roles you can actually take from Brazil, ranks them, prepares the application packet, and fills Greenhouse / Lever / Ashby forms. You click Submit.

This is a personal tool, not a hosted product. It does not scrape LinkedIn and it does not auto-submit.

**Using it:** [GUIDE.md](GUIDE.md)  
**Building it:** [design spec](docs/superpowers/specs/2026-09-03-astra-remote-job-design.md)  
**For agents:** [AGENTS.md](AGENTS.md)

## Quick start

```bash
corepack enable && corepack prepare pnpm@9.15.0 --activate
pnpm install
cp .env.example .env   # optional LLM key — hunting works without it
pnpm dev               # http://127.0.0.1:8790
```

Click **Refresh boards**, then work the queue. Load the Chrome extension from `apps/extension` (unpacked). On LinkedIn/Indeed/Wellfound/Glassdoor, click **Enviar para Astra**. You click Submit on every application.

Full usage, API keys, and the 100-apps week: [GUIDE.md](GUIDE.md).
