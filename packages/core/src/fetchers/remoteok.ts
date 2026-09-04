import { htmlToText } from "../htmlToText.ts";
import type { FetchResult, RawPosting } from "../types.ts";
import { parseJsonLoose, timedFetch } from "./http.ts";

type RemoteOkJob = {
  id?: string | number;
  slug?: string;
  position?: string;
  company?: string;
  location?: string;
  description?: string;
  apply_url?: string;
  url?: string;
  date?: string;
  epoch?: number;
  tags?: string[];
};

export async function fetchRemoteok(
  slug = "dev",
  fetchFn: typeof fetch = fetch,
): Promise<FetchResult> {
  const url = slug && slug !== "all" ? `https://remoteok.com/api?tag=${encodeURIComponent(slug)}` : "https://remoteok.com/api";
  const res = await timedFetch(fetchFn, url);
  if (!res.ok) throw new Error(`remoteok: HTTP ${res.status}`);
  const payload = parseJsonLoose(await res.text());
  const rows = Array.isArray(payload) ? (payload as RemoteOkJob[]) : [];
  const postings: RawPosting[] = rows
    .filter((job) => job.position && (job.id || job.slug))
    .map((job) => {
      const pageUrl = job.url ? `https://remoteok.com/remote-jobs/${job.slug ?? job.id}` : `https://remoteok.com/${job.id}`;
      const location = job.location ?? "Remote";
      return {
        externalId: String(job.id ?? job.slug),
        title: job.position ?? "Untitled",
        company: job.company ?? "Unknown",
        location,
        remote: true,
        url: pageUrl,
        applyUrl: job.apply_url ?? pageUrl,
        description: htmlToText(`${job.description ?? ""}\n${(job.tags ?? []).join(" ")}`),
        postedAt: job.epoch ? new Date(job.epoch * 1000) : job.date ? new Date(job.date) : null,
      };
    });
  return { postings };
}
