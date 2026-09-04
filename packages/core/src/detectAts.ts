import type { Ats } from "./types.ts";

const PATTERNS: { ats: Exclude<Ats, "captured">; re: RegExp }[] = [
  { ats: "greenhouse", re: /https?:\/\/(?:job-boards|boards)\.greenhouse\.io\/[^\s"'<>]+/i },
  { ats: "lever", re: /https?:\/\/jobs\.lever\.co\/[^\s"'<>]+/i },
  { ats: "ashby", re: /https?:\/\/jobs\.ashbyhq\.com\/[^\s"'<>]+/i },
  { ats: "wwr", re: /https?:\/\/weworkremotely\.com\/[^\s"'<>]+/i },
  { ats: "remotive", re: /https?:\/\/remotive\.com\/[^\s"'<>]+/i },
  { ats: "remoteok", re: /https?:\/\/remoteok\.com\/[^\s"'<>]+/i },
];

export function detectAtsApplyUrl(text: string): { ats: Ats; url: string } | null {
  for (const { ats, re } of PATTERNS) {
    const match = text.match(re);
    if (match?.[0]) return { ats, url: match[0].replace(/[),.;]+$/, "") };
  }
  return null;
}
