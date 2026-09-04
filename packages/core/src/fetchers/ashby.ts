import { htmlToText } from "../htmlToText.ts";
import type { FetchResult, RawPosting } from "../types.ts";
import { timedFetch } from "./http.ts";

type AshbyJob = {
  id?: string;
  title?: string;
  location?: string;
  jobUrl?: string;
  applyUrl?: string;
  descriptionHtml?: string;
  descriptionPlain?: string;
  publishedAt?: string;
  isRemote?: boolean;
};

type AshbyPayload = { jobs?: AshbyJob[] };

export async function fetchAshby(
  slug: string,
  fetchFn: typeof fetch = fetch,
  companyName = slug,
): Promise<FetchResult> {
  const url = `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(slug)}`;
  const res = await timedFetch(fetchFn, url);
  if (!res.ok) throw new Error(`ashby ${slug}: HTTP ${res.status}`);
  const payload = (await res.json()) as AshbyPayload;
  const postings: RawPosting[] = (payload.jobs ?? []).map((job) => {
    const location = job.location ?? "";
    const pageUrl = job.jobUrl ?? job.applyUrl ?? "";
    return {
      externalId: String(job.id ?? pageUrl),
      title: job.title ?? "Untitled",
      company: companyName,
      location,
      remote: Boolean(job.isRemote) || location.toLowerCase().includes("remote"),
      url: pageUrl,
      applyUrl: job.applyUrl ?? pageUrl,
      description: htmlToText(job.descriptionPlain ?? job.descriptionHtml ?? ""),
      postedAt: job.publishedAt ? new Date(job.publishedAt) : null,
    };
  });
  return { postings };
}
