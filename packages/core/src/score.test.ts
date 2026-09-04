import { describe, expect, it } from "vitest";
import { scoreJob } from "./score.ts";

const now = new Date("2026-09-03T12:00:00Z");

describe("scoreJob", () => {
  it("uses skill hit count, not a ratio", () => {
    const base = {
      title: "Rails Engineer",
      description: "Ruby on Rails PostgreSQL Sidekiq remote worldwide",
      postedAt: new Date("2026-09-01T00:00:00Z"),
      hiringGeo: "worldwide" as const,
      boardKind: "rails" as const,
      now,
    };
    const few = scoreJob({ ...base, skills: ["Ruby on Rails", "PostgreSQL", "Sidekiq"] });
    const many = scoreJob({
      ...base,
      skills: ["Ruby on Rails", "PostgreSQL", "Sidekiq", "Kafka", "Go", "Kotlin"],
    });
    expect(few).toBe(many);
    expect(few).toBeGreaterThan(50);
  });

  it("scores a known Rails worldwide role with the spec formula", () => {
    // title 30 + skills 10 (2 hits * 5) + worldwide 15 + marketplace 0 + recency 10 + auth 0 = 65
    expect(
      scoreJob({
        title: "Rails Engineer",
        description: "PostgreSQL and Redis. Remote worldwide.",
        postedAt: new Date("2026-09-01T00:00:00Z"),
        hiringGeo: "worldwide",
        boardKind: "rails",
        skills: ["PostgreSQL", "Redis"],
        now,
      }),
    ).toBe(65);
  });

  it("adds marketplace bonus", () => {
    const score = scoreJob({
      title: "Apply to join our network",
      description: "Remote worldwide developers",
      postedAt: new Date("2026-09-01T00:00:00Z"),
      hiringGeo: "worldwide",
      boardKind: "marketplace",
      skills: [],
      now,
    });
    // title 16 + skills 0 + worldwide 15 + marketplace 10 + recency 10 = 51
    expect(score).toBe(51);
  });

  it("penalizes unknown work-auth", () => {
    const known = scoreJob({
      title: "Backend Engineer",
      description: "Remote",
      postedAt: null,
      hiringGeo: "worldwide",
      boardKind: "remote_first",
      skills: [],
    });
    const unknown = scoreJob({
      title: "Backend Engineer",
      description: "Remote",
      postedAt: null,
      hiringGeo: "unknown",
      boardKind: "remote_first",
      skills: [],
    });
    expect(known - unknown).toBe(8);
  });
});
