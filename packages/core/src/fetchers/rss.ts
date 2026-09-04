import { htmlToText } from "../htmlToText.ts";

export type RssItem = {
  title: string;
  link: string;
  description: string;
  pubDate: string | null;
};

function decode(raw: string): string {
  return htmlToText(
    raw
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"'),
  );
}

export function parseRssItems(xml: string): RssItem[] {
  const blocks = xml.match(/<item\b[\s\S]*?<\/item>/gi) ?? [];
  return blocks.map((block) => {
    const tag = (name: string) => {
      const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
      return m?.[1] ? decode(m[1]) : "";
    };
    return {
      title: tag("title"),
      link: tag("link") || tag("guid"),
      description: tag("description") || tag("content:encoded"),
      pubDate: tag("pubDate") || tag("published") || null,
    };
  });
}

/** WWR titles look like "Grafana Labs: Backend Engineer". */
export function splitCompanyTitle(combined: string): { company: string; title: string } {
  const idx = combined.indexOf(": ");
  if (idx <= 0) return { company: combined, title: combined };
  return { company: combined.slice(0, idx).trim(), title: combined.slice(idx + 2).trim() };
}
