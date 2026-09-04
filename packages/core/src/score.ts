import type { BoardKind, HiringGeo } from "./types.ts";

export function scoreJob(input: {
  title: string;
  description: string;
  postedAt: Date | null;
  hiringGeo: HiringGeo;
  boardKind: BoardKind;
  skills: string[];
  now?: Date;
}): number {
  const title = input.title.toLowerCase();
  const description = input.description.toLowerCase();
  const blob = `${title} ${description}`;

  let titlePoints = 8;
  if (title.includes("ruby") || title.includes("rails")) titlePoints = 30;
  else if (title.includes("backend") || title.includes("back-end") || title.includes("back end"))
    titlePoints = 22;
  else if (
    input.boardKind === "marketplace" &&
    (title.includes("apply to join") ||
      title.includes("talent network") ||
      title.includes("developer network") ||
      title.includes("join our"))
  )
    titlePoints = 16;
  else if (
    title.includes("full stack") ||
    title.includes("fullstack") ||
    title.includes("full-stack") ||
    title.includes("software engineer") ||
    title.includes("software developer")
  )
    titlePoints = 14;

  const skillHits = input.skills.filter((s) => blob.includes(s.toLowerCase())).length;
  const skillPoints = Math.min(25, 5 * skillHits);

  let remotePoints = 0;
  if (
    blob.includes("remote worldwide") ||
    blob.includes("work from anywhere") ||
    blob.includes("hire anywhere") ||
    blob.includes("anywhere in the world")
  ) {
    remotePoints = 15;
  } else if (
    blob.includes("remote") &&
    input.hiringGeo !== "us_auth_only" &&
    input.hiringGeo !== "eu_permit_only"
  ) {
    remotePoints = 10;
  }

  const marketplaceBonus = input.boardKind === "marketplace" ? 10 : 0;

  let recency = 0;
  if (input.postedAt) {
    const now = input.now ?? new Date();
    const days = (now.getTime() - input.postedAt.getTime()) / 86_400_000;
    if (days <= 7) recency = 10;
    else if (days <= 30) recency = 5;
  }

  const authPenalty = input.hiringGeo === "unknown" ? -8 : 0;

  const raw = titlePoints + skillPoints + remotePoints + marketplaceBonus + recency + authPenalty;
  return Math.max(0, Math.min(100, Math.round(raw)));
}
