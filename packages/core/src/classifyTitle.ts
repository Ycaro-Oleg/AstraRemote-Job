import type { BoardKind, HiringGeo, RoleFit } from "./types.ts";

function has(hay: string, ...needles: string[]): boolean {
  return needles.some((n) => hay.includes(n));
}

export function classifyTitle(title: string, description: string, kind: BoardKind): RoleFit {
  const t = title.toLowerCase();
  const d = description.toLowerCase().slice(0, 2000);

  const skip =
    has(t, "staff", "principal", "distinguished", "fellow", "director", "vice president", "head of", "chief ") ||
    t.includes("vp ") ||
    t.startsWith("vp ") ||
    /(?:^|[\s/])vp(?:[\s/]|$)/.test(t) ||
    has(t, "intern", "internship", "apprentice") ||
    has(t, "ios", "android", "mobile engineer") ||
    has(t, "data scientist", "machine learning", "research scientist") ||
    t.includes(" ml ") ||
    t.startsWith("ml ") ||
    has(t, "sales", "recruiter", "account executive", "customer success", "product manager") ||
    (has(t, "designer") && !has(t, "software")) ||
    ((has(t, "front-end", "frontend", "front end") || t.includes("front end")) &&
      !has(t, "full stack", "fullstack", "full-stack"));

  if (skip) return "no";

  const rails = has(t, "ruby", "rails") || has(d, "ruby on rails", "ruby/rails");
  const backend = has(t, "backend", "back-end", "back end");
  const fullstack = has(t, "full stack", "fullstack", "full-stack");
  const swe = has(t, "software engineer", "software developer") || /\bswe\b/.test(t);
  const marketplaceKeep =
    kind === "marketplace" &&
    has(t, "apply to join", "talent network", "developer network", "join our");

  const kept = rails || backend || fullstack || swe || marketplaceKeep || has(d, "ruby on rails");
  if (!kept && !has(d, "ruby") && !has(d, "rails")) return "no";

  if (rails || has(d, "ruby") || has(d, "rails")) {
    if (rails || has(d, "ruby on rails") || has(d, "rails")) return "rails";
  }
  if (backend) return "backend";
  if (fullstack) return "fullstack";
  if (kind === "marketplace" && (marketplaceKeep || swe)) return "marketplace";
  if (swe) return "backend";
  if (kind === "marketplace") return "marketplace";
  return "no";
}

export function isHardSkip(roleFit: RoleFit, hiringGeo: HiringGeo): boolean {
  return (
    roleFit === "no" ||
    hiringGeo === "us_auth_only" ||
    hiringGeo === "eu_permit_only" ||
    hiringGeo === "country_locked"
  );
}

/** "Remote" with no Brazil/LATAM/worldwide signal is almost always a US/EU seat. */
export function isUnconfirmedRemote(hiringGeo: HiringGeo, boardKind: BoardKind): boolean {
  return hiringGeo === "unknown" && boardKind !== "marketplace";
}
