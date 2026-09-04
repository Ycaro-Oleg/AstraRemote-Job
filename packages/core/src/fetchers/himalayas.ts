import { htmlToText } from "../htmlToText.ts";
import type { FetchResult, RawPosting } from "../types.ts";
import { parseJsonLoose, timedFetch } from "./http.ts";

type HimalayasJob = {
  guid?: string;
  title?: string;
  companyName?: string;
  excerpt?: string;
  description?: string;
  applicationLink?: string;
  pubDate?: number | string;
  locationRestrictions?: string[];
  seniority?: string;
};

type HimalayasPayload = { jobs?: HimalayasJob[] };

export async function fetchHimalayas(
  slug = "rails",
  fetchFn: typeof fetch = fetch,
): Promise<FetchResult> {
  const url = `https://himalayas.app/jobs/api/search?q=${encodeURIComponent(slug)}&limit=20`;
  const res = await timedFetch(fetchFn, url);
  if (!res.ok) throw new Error(`himalayas ${slug}: HTTP ${res.status}`);
  const payload = parseJsonLoose(await res.text()) as HimalayasPayload;
  const postings: RawPosting[] = (payload.jobs ?? []).map((job) => {
    const pageUrl = job.applicationLink ?? "";
    const location = (job.locationRestrictions ?? []).join(", ") || "Remote";
    const posted =
      typeof job.pubDate === "number"
        ? new Date(job.pubDate > 10_000_000_000 ? job.pubDate : job.pubDate * 1000)
        : job.pubDate
          ? new Date(job.pubDate)
          : null;
    return {
      externalId: String(job.guid ?? pageUrl ?? job.title),
      title: job.title ?? "Untitled",
      company: job.companyName ?? "Unknown",
      location,
      remote: true,
      url: pageUrl,
      applyUrl: pageUrl,
      description: htmlToText(`${job.description ?? job.excerpt ?? ""}\n${job.seniority ?? ""}`),
      postedAt: posted && !Number.isNaN(posted.getTime()) ? posted : null,
    };
  });
  return { postings };
}
