import type { ResumeDocument } from "./types.ts";

export type FactCheck = { ok: true } | { ok: false; reason: string };

function masterText(master: ResumeDocument): string {
  const parts = [
    master.summary,
    ...master.skills,
    ...master.experience.flatMap((e) => [
      e.company,
      e.title,
      e.start,
      e.end,
      ...e.bullets.map((b) => b.text),
    ]),
    ...master.education.flatMap((e) => [e.school, e.degree, e.end, e.gpa ?? ""]),
    ...master.projects.flatMap((p) => [p.name, p.text, p.url ?? ""]),
  ];
  return parts.join("\n").toLowerCase();
}

const NUMBER = /\d+(?:\.\d+)?%?/g;

export function factCheckResume(master: ResumeDocument, candidate: ResumeDocument): FactCheck {
  const hay = masterText(master);
  const masterCompanies = new Set(master.experience.map((e) => e.company.toLowerCase()));
  const masterKeys = new Set(
    master.experience.map((e) => `${e.company.toLowerCase()}|${e.title.toLowerCase()}|${e.start}|${e.end}`),
  );

  for (const exp of candidate.experience) {
    const key = `${exp.company.toLowerCase()}|${exp.title.toLowerCase()}|${exp.start}|${exp.end}`;
    if (!masterKeys.has(key)) {
      return {
        ok: false,
        reason: `experience not in master: ${exp.company} / ${exp.title} / ${exp.start}–${exp.end}`,
      };
    }
  }

  const extraCompany = candidate.experience.find((e) => !masterCompanies.has(e.company.toLowerCase()));
  if (extraCompany) {
    return { ok: false, reason: `unknown employer: ${extraCompany.company}` };
  }

  const masterSkillSet = new Set(master.skills.map((s) => s.toLowerCase()));
  const masterBlob = hay;
  for (const skill of candidate.skills) {
    const s = skill.toLowerCase();
    if (!masterSkillSet.has(s) && !masterBlob.includes(s)) {
      return { ok: false, reason: `unknown skill: ${skill}` };
    }
  }

  if (JSON.stringify(candidate.education) !== JSON.stringify(master.education)) {
    return { ok: false, reason: "education must be unchanged" };
  }

  for (const exp of candidate.experience) {
    for (const bullet of exp.bullets) {
      const numbers = bullet.text.match(NUMBER) ?? [];
      for (const n of numbers) {
        if (!hay.includes(n.toLowerCase())) {
          return { ok: false, reason: `invented number in bullet: ${n}` };
        }
      }
    }
  }

  return { ok: true };
}
