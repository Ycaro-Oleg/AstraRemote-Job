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
  expiryDate?: number | string;
  locationRestrictions?: string[];
  timezoneRestrictions?: number[];
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
  const now = Date.now();
  const postings: RawPosting[] = [];
  for (const job of payload.jobs ?? []) {
    const expiresAt = parseHimalayaDate(job.expiryDate);
    if (expiresAt && expiresAt.getTime() <= now) continue;
    const pageUrl = job.applicationLink ?? "";
    const restrictions = job.locationRestrictions ?? [];
    const tz = job.timezoneRestrictions ?? [];
    const locationParts = [...restrictions];
    if (tz.length) locationParts.push(`tz:${tz.join(",")}`);
    const posted = parseHimalayaDate(job.pubDate);
    postings.push({
      externalId: String(job.guid ?? pageUrl ?? job.title),
      title: job.title ?? "Untitled",
      company: job.companyName ?? "Unknown",
      location: locationParts.join(", ") || "Remote",
      remote: true,
      url: pageUrl,
      applyUrl: pageUrl,
      description: htmlToText(`${job.description ?? job.excerpt ?? ""}\n${job.seniority ?? ""}`),
      postedAt: posted,
      expiresAt,
    });
  }
  return { postings };
}

function parseHimalayaDate(value: number | string | undefined): Date | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") {
    const d = new Date(value > 10_000_000_000 ? value : value * 1000);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}
