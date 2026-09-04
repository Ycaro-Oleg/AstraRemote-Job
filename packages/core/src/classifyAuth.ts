import type { HiringGeo } from "./types.ts";

const US_AUTH_PATTERNS: RegExp[] = [
  /authorized to work in the united states/,
  /authorized to work in the u\.s\.?/,
  /authorized to work in the usa/,
  /eligible to work in the united states/,
  /eligibility to work in the united states/,
  /without visa sponsorship/,
  /without sponsorship/,
  /we do not sponsor/,
  /we don't sponsor/,
  /no sponsorship/,
  /must have u\.?s\.? work authorization/,
  /u\.?s\.? work authorization required/,
  /\bus persons?\b/,
  /\bu\.s\. persons?\b/,
  /citizenship or permanent residency/,
  /green card required/,
];

const EU_PERMIT_PATTERNS: RegExp[] = [
  /right to work in the uk/,
  /right to work in the united kingdom/,
  /right to work in ireland/,
  /right to work in the eu/,
  /right to work in the european union/,
  /right to work in the eea/,
  /must have (an? )?(eu|uk|eea) (passport|work permit|right to work)/,
  /valid german work/,
  /netherlands work permit/,
  /(france|germany|spain|italy|netherlands|sweden|ireland) work permit required/,
];

const WORLDWIDE_PATTERNS: RegExp[] = [
  /remote worldwide/,
  /work from anywhere/,
  /hire anywhere/,
  /anywhere in the world/,
  /no geographic restriction/,
  /unrestricted location/,
];

const KEEP_REGION = [
  "worldwide",
  "anywhere",
  "any country",
  "any location",
  "global",
  "latam",
  "latin america",
  "south america",
  "brazil",
  "brasil",
  "americas",
];

const BRAZIL_CITIES = [
  "sao paulo",
  "são paulo",
  "rio de janeiro",
  "fortaleza",
  "recife",
  "salvador",
  "brasilia",
  "brasília",
  "curitiba",
  "belo horizonte",
  "porto alegre",
  "campinas",
  "florianopolis",
  "florianópolis",
  "manaus",
];

const US_LOCK = [
  "united states",
  "usa",
  "u.s.",
  "us only",
  "usa only",
  "us timezones",
  "usa timezones",
  "north america",
];

const OTHER_LOCK = [
  "spain",
  "united kingdom",
  "england",
  "scotland",
  "wales",
  "ireland",
  "germany",
  "france",
  "netherlands",
  "italy",
  "poland",
  "sweden",
  "norway",
  "denmark",
  "finland",
  "switzerland",
  "austria",
  "belgium",
  "portugal",
  "greece",
  "romania",
  "hungary",
  "bulgaria",
  "cyprus",
  "lithuania",
  "latvia",
  "estonia",
  "serbia",
  "georgia",
  "canada",
  "australia",
  "india",
  "pakistan",
  "singapore",
  "japan",
  "israel",
  "uae",
  "dubai",
  "mexico",
  "lebanon",
  "beirut",
  "kenya",
  "nigeria",
  "emea",
  "europe only",
  "eu only",
  "uk only",
  "apac",
  "london",
  "edinburgh",
  "manchester",
  "dublin",
  "barcelona",
  "madrid",
  "berlin",
  "munich",
  "münchen",
  "hamburg",
  "leipzig",
  "mainz",
  "amsterdam",
  "paris",
  "lisbon",
  "lisboa",
  "warsaw",
  "stockholm",
  "oslo",
  "copenhagen",
  "vienna",
  "zurich",
  "zürich",
  "toronto",
  "vancouver",
  "montreal",
  "new york",
  "san francisco",
  "seattle",
  "austin",
  "chicago",
  "boston",
  "denver",
  "atlanta",
  "los angeles",
  "miami",
  "helsinki",
  "stockholm",
  "finland",
  "cambridge",
  "korea",
  "seoul",
  "nyc",
];

function parseTimezones(location: string): number[] | null {
  const m = location.match(/\btz:([0-9,+\-\s]+)/i);
  if (!m?.[1]) return null;
  const nums = m[1]
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n));
  return nums.length ? nums : null;
}

function locationAllowsBrazil(location: string, title: string): boolean | null {
  const loc = location.toLowerCase();
  const tit = title.toLowerCase();
  const hay = `${loc} ${tit}`;

  if (BRAZIL_CITIES.some((k) => loc.includes(k))) return true;
  if (KEEP_REGION.some((k) => loc.includes(k) && k !== "americas")) return true;
  if (/\bamericas\b/.test(loc) && !loc.includes("north america")) return true;
  if (/\b(brazil|brasil|latam|latin america|worldwide)\b/.test(tit)) return true;

  const tz = parseTimezones(location);
  if (tz && !tz.includes(-3) && !tz.includes(-2) && !tz.includes(-4)) return false;

  const usHit = US_LOCK.some((k) => loc.includes(k) || /(?:^|[\s|,(-])us(?:[\s|,)-]|$)/.test(loc));
  const otherHit = OTHER_LOCK.some((k) => loc.includes(k) || tit.includes(`${k} only`));
  const spainTitle = /\|\s*spain\s*\|/i.test(title) || /\bspain only\b/i.test(title);
  const usTitle = /\bus only\b/i.test(title) || /\|\s*united states\s*\|/i.test(title);
  const ukWord = /\buk\b/.test(loc);

  if (spainTitle || usTitle) return false;
  if (loc.trim() === "na") return false;
  if (usHit || otherHit || ukWord) {
    if (KEEP_REGION.some((k) => loc.includes(k))) return true;
    return false;
  }
  const namedPlace = loc.replace(/[,.;]/g, " ").trim();
  if (namedPlace.length > 2 && !loc.includes("remote") && !KEEP_REGION.some((k) => loc.includes(k))) {
    return false;
  }
  return null;
}

export function classifyHiringGeo(input: {
  title?: string;
  location?: string;
  description?: string;
}): HiringGeo {
  const title = input.title ?? "";
  const location = input.location ?? "";
  const description = input.description ?? "";
  const legal = `${title}\n${location}\n${description}`.toLowerCase();

  if (US_AUTH_PATTERNS.some((re) => re.test(legal))) return "us_auth_only";
  if (EU_PERMIT_PATTERNS.some((re) => re.test(legal))) return "eu_permit_only";

  const allowed = locationAllowsBrazil(location, title);
  if (allowed === false) {
    const loc = location.toLowerCase();
    if (US_LOCK.some((k) => loc.includes(k))) return "us_auth_only";
    if (
      OTHER_LOCK.some((k) => loc.includes(k)) ||
      /\bspain\b/.test(title.toLowerCase()) ||
      /\buk only\b/.test(title.toLowerCase())
    ) {
      return "country_locked";
    }
    return "country_locked";
  }

  if (WORLDWIDE_PATTERNS.some((re) => re.test(legal))) return "worldwide";
  if (allowed === true) return "worldwide";
  return "unknown";
}

export function classifyAuth(text: string): HiringGeo {
  return classifyHiringGeo({ title: "", location: "", description: text });
}

export const MAX_POST_AGE_DAYS = 35;

export function isExpired(
  postedAt: Date | null | undefined,
  expiresAt: Date | null | undefined,
  now = new Date(),
): boolean {
  if (expiresAt && !Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() <= now.getTime()) {
    return true;
  }
  if (postedAt && !Number.isNaN(postedAt.getTime())) {
    const days = (now.getTime() - postedAt.getTime()) / 86_400_000;
    if (days > MAX_POST_AGE_DAYS) return true;
  }
  return false;
}
