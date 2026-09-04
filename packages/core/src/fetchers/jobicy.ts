import { htmlToText } from "../htmlToText.ts";
import type { FetchResult, RawPosting } from "../types.ts";
import { parseJsonLoose, timedFetch } from "./http.ts";

type JobicyJob = {
  id?: number | string;
  url?: string;
  jobTitle?: string;
  companyName?: string;
  jobGeo?: string;
  jobDescription?: string;
  jobExcerpt?: string;
  pubDate?: string;
};

type JobicyPayload = { jobs?: JobicyJob[] };

export async function fetchJobicy(slug = "dev", fetchFn: typeof fetch = fetch): Promise<FetchResult> {
  const url = `https://jobicy.com/api/v2/remote-jobs?count=20&tag=${encodeURIComponent(slug)}`;
  const res = await timedFetch(fetchFn, url);
  if (!res.ok) throw new Error(`jobicy ${slug}: HTTP ${res.status}`);
  const payload = parseJsonLoose(await res.text()) as JobicyPayload;
  const postings: RawPosting[] = (payload.jobs ?? []).map((job) => {
    const pageUrl = job.url ?? "";
    return {
      externalId: String(job.id ?? pageUrl),
      title: job.jobTitle ?? "Untitled",
      company: job.companyName ?? "Unknown",
      location: job.jobGeo ?? "Remote",
      remote: true,
      url: pageUrl,
      applyUrl: pageUrl,
      description: htmlToText(job.jobDescription ?? job.jobExcerpt ?? ""),
      postedAt: job.pubDate ? new Date(job.pubDate) : null,
    };
  });
  return { postings };
}
