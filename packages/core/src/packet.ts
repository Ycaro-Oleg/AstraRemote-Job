import type { Profile } from "./types.ts";

export function templateCoverLetter(
  profile: Profile,
  job: { title: string; company: string; description: string },
): string {
  const blob = `${job.title} ${job.description}`.toLowerCase();
  const matchedSkills = profile.skills.filter((s) => blob.includes(s.toLowerCase()));
  const bullets = profile.resume.experience
    .flatMap((exp) => exp.bullets)
    .sort((a, b) => {
      const score = (bullet: typeof a) =>
        bullet.keywords.filter((k) => blob.includes(k.toLowerCase())).length;
      return score(b) - score(a);
    })
    .slice(0, 3);

  const lines = [
    `Dear ${job.company} Hiring Team,`,
    "",
    `I'm applying for the ${job.title} role. ${profile.resume.summary}`,
    "",
  ];
  if (bullets.length > 0) {
    lines.push("A few relevant highlights:");
    for (const b of bullets) lines.push(`- ${b.text}`);
    lines.push("");
  }
  if (matchedSkills.length > 0) {
    lines.push(
      `This role lines up with my hands-on work in ${matchedSkills.slice(0, 8).join(", ")}.`,
      "",
    );
  }
  lines.push(
    `I work remotely from Brazil as a contractor / via EOR and would welcome a conversation about ${job.company}.`,
    "",
    "Best regards,",
    profile.name,
    [profile.email, profile.phone, profile.linkedinUrl].filter(Boolean).join(" | "),
  );
  return lines.join("\n");
}

export const COVER_LETTER_SYSTEM = `You write short, truthful job application cover letters in English.
150-220 words. No invented metrics, employers, titles, or skills.
The candidate is based in Fortaleza, Brazil and works remotely as a contractor or via EOR.
Do not claim US/EU work authorization. Do not use clichés like "passionate" as filler.`;
