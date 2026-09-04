import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { fetchAshby } from "./ashby.ts";

const dir = dirname(fileURLToPath(import.meta.url));

describe("fetchAshby", () => {
  it("maps job-board JSON", async () => {
    const body = readFileSync(join(dir, "../../fixtures/ashby/jobs.json"), "utf8");
    const fetchFn: typeof fetch = async () => new Response(body, { status: 200 });
    const { postings } = await fetchAshby("deel", fetchFn, "Deel");
    expect(postings[0]).toMatchObject({
      externalId: "job_1",
      title: "Full Stack Engineer",
      remote: true,
    });
    expect(postings[0]?.description).toContain("Rails and React");
  });
});
