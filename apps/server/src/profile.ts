import { YCARO_PROFILE, type Profile } from "@astra/core";
import { eq } from "drizzle-orm";
import { db } from "./db/client.ts";
import { profiles } from "./db/schema.ts";

export function parseProfile(row: typeof profiles.$inferSelect): Profile {
  return {
    name: row.name,
    email: row.email,
    phone: row.phone,
    city: row.city,
    country: row.country,
    linkedinUrl: row.linkedinUrl,
    githubUrl: row.githubUrl,
    websiteUrl: row.websiteUrl,
    currentTitle: row.currentTitle,
    currentCompany: row.currentCompany,
    yearsExperience: row.yearsExperience,
    yearsRuby: row.yearsRuby,
    yearsRails: row.yearsRails,
    noticePeriodDays: row.noticePeriodDays,
    salaryTarget: row.salaryTarget,
    basedIn: row.basedIn,
    needsUsSponsorship: row.needsUsSponsorship,
    availableAs: JSON.parse(row.availableAs) as string[],
    skills: JSON.parse(row.skills) as string[],
    targetTitles: JSON.parse(row.targetTitles) as string[],
    targetKeywords: JSON.parse(row.targetKeywords) as string[],
    answers: JSON.parse(row.answers) as Profile["answers"],
    resume: JSON.parse(row.resume) as Profile["resume"],
  };
}

export function getProfile(): Profile {
  const row = db.select().from(profiles).limit(1).all()[0];
  if (!row) return YCARO_PROFILE;
  return parseProfile(row);
}

export function seedProfileIfNeeded() {
  const existing = db.select().from(profiles).limit(1).all()[0];
  if (existing) return;
  const p = YCARO_PROFILE;
  db.insert(profiles)
    .values({
      name: p.name,
      email: p.email,
      phone: p.phone,
      city: p.city,
      country: p.country,
      linkedinUrl: p.linkedinUrl,
      githubUrl: p.githubUrl,
      websiteUrl: p.websiteUrl,
      currentTitle: p.currentTitle,
      currentCompany: p.currentCompany,
      yearsExperience: p.yearsExperience,
      yearsRuby: p.yearsRuby,
      yearsRails: p.yearsRails,
      noticePeriodDays: p.noticePeriodDays,
      salaryTarget: p.salaryTarget,
      basedIn: p.basedIn,
      needsUsSponsorship: p.needsUsSponsorship,
      availableAs: JSON.stringify(p.availableAs),
      skills: JSON.stringify(p.skills),
      targetTitles: JSON.stringify(p.targetTitles),
      targetKeywords: JSON.stringify(p.targetKeywords),
      answers: JSON.stringify(p.answers),
      resume: JSON.stringify(p.resume),
      updatedAt: new Date().toISOString(),
    })
    .run();
}

export function saveProfile(p: Profile) {
  const row = db.select().from(profiles).limit(1).all()[0];
  const values = {
    name: p.name,
    email: p.email,
    phone: p.phone,
    city: p.city,
    country: p.country,
    linkedinUrl: p.linkedinUrl,
    githubUrl: p.githubUrl,
    websiteUrl: p.websiteUrl,
    currentTitle: p.currentTitle,
    currentCompany: p.currentCompany,
    yearsExperience: p.yearsExperience,
    yearsRuby: p.yearsRuby,
    yearsRails: p.yearsRails,
    noticePeriodDays: p.noticePeriodDays,
    salaryTarget: p.salaryTarget,
    basedIn: p.basedIn,
    needsUsSponsorship: p.needsUsSponsorship,
    availableAs: JSON.stringify(p.availableAs),
    skills: JSON.stringify(p.skills),
    targetTitles: JSON.stringify(p.targetTitles),
    targetKeywords: JSON.stringify(p.targetKeywords),
    answers: JSON.stringify(p.answers),
    resume: JSON.stringify(p.resume),
    updatedAt: new Date().toISOString(),
  };
  if (!row) {
    db.insert(profiles).values(values).run();
    return;
  }
  db.update(profiles).set(values).where(eq(profiles.id, row.id)).run();
}
