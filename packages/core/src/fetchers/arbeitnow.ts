import { htmlToText } from "../htmlToText.ts";
import type { FetchResult, RawPosting } from "../types.ts";
import { parseJsonLoose, timedFetch } from "./http.ts";

type ArbeitnowJob = {
  slug?: string;
  company_name?: string;
  title?: string;
  description?: string;
  remote?: boolean;
  url?: string;
  location?: string;
  created_at?: number | string;
  tags?: string[];
};

type ArbeitnowPayload = { data?: ArbeitnowJob[] };

export async function fetchArbeitnow(
  _slug = "feed",
  fetchFn: typeof fetch = fetch,
): Promise<FetchResult> {
  const url = "https://www.arbeitnow.com/api/job-board-api";
  const res = await timedFetch(fetchFn, url);
  if (!res.ok) throw new Error(`arbeitnow: HTTP ${res.status}`);
  const payload = parseJsonLoose(await res.text()) as ArbeitnowPayload;
  const postings: RawPosting[] = (payload.data ?? []).map((job) => {
    const pageUrl = job.url ?? "";
    const created =
      typeof job.created_at === "number" ? new Date(job.created_at * 1000) : job.created_at ? new Date(job.created_at) : null;
    return {
      externalId: String(job.slug ?? pageUrl),
      title: job.title ?? "Untitled",
      company: job.company_name ?? "Unknown",
      location: job.location ?? "Remote",
      remote: Boolean(job.remote) || (job.location ?? "").toLowerCase().includes("remote"),
      url: pageUrl,
      applyUrl: pageUrl,
      description: htmlToText(`${job.description ?? ""}\n${(job.tags ?? []).join(" ")}`),
      postedAt: created && !Number.isNaN(created.getTime()) ? created : null,
    };
  });
  return { postings };
}
