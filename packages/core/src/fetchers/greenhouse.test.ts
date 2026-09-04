import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { fetchGreenhouse } from "./greenhouse.ts";

const dir = dirname(fileURLToPath(import.meta.url));

describe("fetchGreenhouse", () => {
  it("maps board JSON into postings without hitting the network", async () => {
    const body = readFileSync(join(dir, "../../fixtures/greenhouse/jobs.json"), "utf8");
    const fetchFn: typeof fetch = async () =>
      new Response(body, { status: 200, headers: { "content-type": "application/json" } });
    const { postings } = await fetchGreenhouse("gitlab", fetchFn, "GitLab");
    expect(postings).toHaveLength(1);
    expect(postings[0]).toMatchObject({
      externalId: "99",
      title: "Backend Engineer",
      company: "GitLab",
      applyUrl: "https://job-boards.greenhouse.io/gitlab/jobs/99",
    });
    expect(postings[0]?.description).toContain("Ruby on Rails");
    expect(postings[0]?.description).not.toContain("<p>");
  });
});
