import { describe, expect, it } from "vitest";
import { templateCoverLetter } from "./packet.ts";
import { YCARO_PROFILE } from "./ycaroProfile.ts";

describe("templateCoverLetter", () => {
  it("stays truthful and mentions the company", () => {
    const letter = templateCoverLetter(YCARO_PROFILE, {
      title: "Rails Engineer",
      company: "GitLab",
      description: "Ruby on Rails PostgreSQL Sidekiq",
    });
    expect(letter).toContain("GitLab");
    expect(letter).toContain("Rails Engineer");
    expect(letter).toContain(YCARO_PROFILE.name);
    expect(letter).not.toMatch(/Google|Meta|FAANG/i);
  });
});
