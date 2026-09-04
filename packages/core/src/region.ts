import type { Region } from "./types.ts";

const EUROPE_HINTS = [
  "europe",
  "emea",
  "eu ",
  " eu",
  "remote-europe",
  "remote-emea",
  "portugal",
  "spain",
  "france",
  "germany",
  "netherlands",
  "ireland",
  "united kingdom",
  " uk",
  "uk ",
  "belgium",
  "italy",
  "poland",
  "sweden",
  "norway",
  "denmark",
  "finland",
  "switzerland",
  "austria",
  "czech",
  "romania",
  "hungary",
  "greece",
  "croatia",
  "estonia",
  "latvia",
  "lithuania",
  "luxembourg",
  "iceland",
];

const US_HINTS = [
  "united states",
  "usa",
  "u.s.",
  "remote-us",
  "remote-usa",
  "california",
  "new york",
  "texas",
  "washington",
  "chicago",
  "boston",
  "seattle",
  "austin",
  "denver",
  "atlanta",
  "florida",
];

export function regionFor(location: string, title: string): Region {
  const haystack = `${location} ${title}`.toLowerCase();
  if (haystack.includes("remote")) return "remote";
  if (EUROPE_HINTS.some((hint) => haystack.includes(hint))) return "europe";
  if (US_HINTS.some((hint) => haystack.includes(hint))) return "us";
  return "other";
}
