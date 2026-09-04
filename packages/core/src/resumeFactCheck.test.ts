import { describe, expect, it } from "vitest";
import { factCheckResume } from "./resumeFactCheck.ts";
import { YCARO_PROFILE } from "./ycaroProfile.ts";

const master = YCARO_PROFILE.resume;

describe("factCheckResume", () => {
  it("rejects an invented employer", () => {
    const candidate = structuredClone(master);
    candidate.experience.push({
      id: "lie",
      company: "Google",
      title: "Staff Engineer",
      start: "2020-01",
      end: "2022-01",
      bullets: [{ id: "x", text: "Invented.", keywords: [] }],
    });
    const result = factCheckResume(master, candidate);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/not in master|unknown employer/i);
  });

  it("accepts reordered bullets with the same facts", () => {
    const candidate = structuredClone(master);
    const first = candidate.experience[0];
    if (!first) throw new Error("missing experience");
    first.bullets = [...first.bullets].reverse();
    expect(factCheckResume(master, candidate)).toEqual({ ok: true });
  });

  it("rejects a new metric that is not in the master", () => {
    const candidate = structuredClone(master);
    const bullet = candidate.experience[0]?.bullets[0];
    if (!bullet) throw new Error("missing bullet");
    bullet.text = "Increased revenue by 900%.";
    const result = factCheckResume(master, candidate);
    expect(result.ok).toBe(false);
  });
});
