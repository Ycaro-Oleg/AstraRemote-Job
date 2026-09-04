import { htmlToText } from "../htmlToText.ts";
import type { FetchResult, RawPosting } from "../types.ts";
import { timedFetch } from "./http.ts";

type LeverPosting = {
  id?: string;
  text?: string;
  hostedUrl?: string;
  applyUrl?: string;
  descriptionPlain?: string;
  description?: string;
  createdAt?: number;
  categories?: { location?: string; commitment?: string };
};

export async function fetchLever(
  slug: string,
  fetchFn: typeof fetch = fetch,
  companyName = slug,
): Promise<FetchResult> {
  const url = `https://api.lever.co/v0/postings/${encodeURIComponent(slug)}?mode=json`;
  const res = await timedFetch(fetchFn, url);
  if (!res.ok) throw new Error(`lever ${slug}: HTTP ${res.status}`);
  const payload = (await res.json()) as LeverPosting[];
  const postings: RawPosting[] = (Array.isArray(payload) ? payload : []).map((job) => {
    const location = job.categories?.location ?? "";
    const pageUrl = job.hostedUrl ?? job.applyUrl ?? "";
    return {
      externalId: String(job.id ?? pageUrl),
      title: job.text ?? "Untitled",
      company: companyName,
      location,
      remote: location.toLowerCase().includes("remote"),
      url: pageUrl,
      applyUrl: job.applyUrl ?? pageUrl,
      description: htmlToText(job.descriptionPlain ?? job.description ?? ""),
      postedAt: job.createdAt ? new Date(job.createdAt) : null,
    };
  });
  return { postings };
}
