import type { FetchResult, RawPosting } from "../types.ts";
import { timedFetch } from "./http.ts";
import { parseRssItems, splitCompanyTitle } from "./rss.ts";

const FEEDS: Record<string, string> = {
  programming: "https://weworkremotely.com/categories/remote-programming-jobs.rss",
  backend: "https://weworkremotely.com/categories/remote-back-end-programming-jobs.rss",
  fullstack: "https://weworkremotely.com/categories/remote-full-stack-programming-jobs.rss",
};

export async function fetchWwr(slug = "backend", fetchFn: typeof fetch = fetch): Promise<FetchResult> {
  const url = FEEDS[slug] ?? FEEDS.programming ?? "";
  const res = await timedFetch(fetchFn, url);
  if (!res.ok) throw new Error(`wwr ${slug}: HTTP ${res.status}`);
  const xml = await res.text();
  const postings: RawPosting[] = parseRssItems(xml).map((item) => {
    const split = splitCompanyTitle(item.title);
    return {
      externalId: item.link || item.title,
      title: split.title,
      company: split.company,
      location: "Remote",
      remote: true,
      url: item.link,
      applyUrl: item.link,
      description: item.description,
      postedAt: item.pubDate ? new Date(item.pubDate) : null,
    };
  });
  return { postings };
}
