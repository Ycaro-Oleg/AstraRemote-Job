import { htmlToText } from "../htmlToText.ts";
import type { FetchResult, RawPosting } from "../types.ts";
import { timedFetch } from "./http.ts";

type GreenhouseJob = {
  id: number | string;
  title?: string;
  absolute_url?: string;
  updated_at?: string;
  content?: string;
  location?: { name?: string };
};

type GreenhousePayload = { jobs?: GreenhouseJob[] };

export async function fetchGreenhouse(
  slug: string,
  fetchFn: typeof fetch = fetch,
  companyName = slug,
): Promise<FetchResult> {
  const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(slug)}/jobs?content=true`;
  const res = await timedFetch(fetchFn, url);
  if (!res.ok) throw new Error(`greenhouse ${slug}: HTTP ${res.status}`);
  const payload = (await res.json()) as GreenhousePayload;
  const postings: RawPosting[] = (payload.jobs ?? []).map((job) => {
    const location = job.location?.name ?? "";
    const pageUrl = job.absolute_url ?? "";
    return {
      externalId: String(job.id),
      title: job.title ?? "Untitled",
      company: companyName,
      location,
      remote: location.toLowerCase().includes("remote"),
      url: pageUrl,
      applyUrl: pageUrl,
      description: htmlToText(job.content ?? ""),
      postedAt: job.updated_at ? new Date(job.updated_at) : null,
    };
  });
  return { postings };
}
