import { htmlToText } from "../htmlToText.ts";
import type { FetchResult, RawPosting } from "../types.ts";
import { parseJsonLoose, timedFetch } from "./http.ts";

type RemotiveJob = {
  id?: number | string;
  url?: string;
  title?: string;
  company_name?: string;
  description?: string;
  publication_date?: string;
  candidate_required_location?: string;
  tags?: string[];
};

type RemotivePayload = { jobs?: RemotiveJob[] };

export async function fetchRemotive(
  slug = "software-dev",
  fetchFn: typeof fetch = fetch,
): Promise<FetchResult> {
  const url = `https://remotive.com/api/remote-jobs?category=${encodeURIComponent(slug)}`;
  const res = await timedFetch(fetchFn, url);
  if (!res.ok) throw new Error(`remotive ${slug}: HTTP ${res.status}`);
  const payload = parseJsonLoose(await res.text()) as RemotivePayload;
  const postings: RawPosting[] = (payload.jobs ?? []).map((job) => {
    const pageUrl = job.url ?? "";
    const location = job.candidate_required_location ?? "Remote";
    return {
      externalId: String(job.id ?? pageUrl),
      title: job.title ?? "Untitled",
      company: job.company_name ?? "Unknown",
      location,
      remote: true,
      url: pageUrl,
      applyUrl: pageUrl,
      description: htmlToText(`${job.description ?? ""}\n${(job.tags ?? []).join(" ")}`),
      postedAt: job.publication_date ? new Date(job.publication_date) : null,
    };
  });
  return { postings };
}
