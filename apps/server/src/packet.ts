import {
  COVER_LETTER_SYSTEM,
  factCheckResume,
  templateCoverLetter,
  type ResumeDocument,
} from "@astra/core";
import { eq } from "drizzle-orm";
import { db } from "./db/client.ts";
import { jobs } from "./db/schema.ts";
import { createLlmClient } from "./llm.ts";
import { getProfile } from "./profile.ts";

export async function buildPacket(jobId: number, tailorResume: boolean) {
  const job = db.select().from(jobs).where(eq(jobs.id, jobId)).all()[0];
  if (!job) throw new Error("job not found");
  const profile = getProfile();

  if (job.status === "new" || job.status === "queued") {
    db.update(jobs).set({ status: "applying" }).where(eq(jobs.id, job.id)).run();
  }

  let coverLetter = templateCoverLetter(profile, {
    title: job.title,
    company: job.company,
    description: job.description,
  });
  let why = `I'm interested in ${job.title} at ${job.company} because it matches my Rails/backend work on high-availability integrations, and I can contribute remotely from Brazil as a contractor or via EOR.`;
  let usedLlm = false;
  const llm = createLlmClient();
  if (llm) {
    try {
      coverLetter = await llm.complete({
        system: COVER_LETTER_SYSTEM,
        user: `Candidate profile:\n${JSON.stringify({
          name: profile.name,
          headline: profile.resume.summary,
          bullets: profile.resume.experience.flatMap((e) => e.bullets.map((b) => b.text)),
          skills: profile.skills,
        })}\n\nJob: ${job.title} at ${job.company}\n${job.description.slice(0, 6000)}`,
      });
      why = await llm.complete({
        system:
          "Write 2-4 sentences on why this candidate wants this specific company/role. Truth only. No US/EU work-auth claims. English.",
        user: `Company ${job.company}, role ${job.title}. Candidate: Rails/backend in Brazil, contractor/EOR. JD:\n${job.description.slice(0, 3000)}`,
      });
      usedLlm = true;
    } catch {
      usedLlm = false;
    }
  }

  let tailor: { used: "master" | "tailored"; reason?: string } = { used: "master" };
  if (tailorResume && llm) {
    try {
      const raw = await llm.complete({
        system:
          "Return JSON for a resume. You may reorder and rephrase bullets. You must not add employers, titles, dates, or metrics that are not in the master resume. Keep education unchanged. Skills must already appear in the master.",
        user: JSON.stringify({ master: profile.resume, job: { title: job.title, company: job.company, description: job.description.slice(0, 6000) } }),
        jsonSchema: {},
      });
      const parsed = JSON.parse(raw) as ResumeDocument;
      const check = factCheckResume(profile.resume, parsed);
      if (check.ok) {
        db.update(jobs)
          .set({ tailoredResumeJson: JSON.stringify(parsed) })
          .where(eq(jobs.id, job.id))
          .run();
        tailor = { used: "tailored" };
      } else {
        tailor = { used: "master", reason: check.reason };
      }
    } catch (err) {
      tailor = { used: "master", reason: err instanceof Error ? err.message : "tailor failed" };
    }
  }

  db.update(jobs)
    .set({ coverLetter, whyThisCompany: why })
    .where(eq(jobs.id, job.id))
    .run();

  return {
    job: { ...job, status: job.status === "new" || job.status === "queued" ? "applying" : job.status },
    answers: profile.answers,
    coverLetter,
    whyThisCompany: why,
    usedLlm,
    resume: tailor,
  };
}
