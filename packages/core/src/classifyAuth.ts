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
];

export function classifyAuth(text: string): HiringGeo {
  const hay = text.toLowerCase();
  const us = US_AUTH_PATTERNS.some((re) => re.test(hay));
  const eu = EU_PERMIT_PATTERNS.some((re) => re.test(hay));
  if (us) return "us_auth_only";
  if (eu) return "eu_permit_only";
  if (WORLDWIDE_PATTERNS.some((re) => re.test(hay))) return "worldwide";
  return "unknown";
}
