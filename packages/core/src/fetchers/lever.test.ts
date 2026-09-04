import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { fetchLever } from "./lever.ts";

const dir = dirname(fileURLToPath(import.meta.url));

describe("fetchLever", () => {
  it("maps postings JSON", async () => {
    const body = readFileSync(join(dir, "../../fixtures/lever/jobs.json"), "utf8");
    const fetchFn: typeof fetch = async () => new Response(body, { status: 200 });
    const { postings } = await fetchLever("toptal", fetchFn, "Toptal");
    expect(postings[0]).toMatchObject({
      externalId: "abc",
      title: "Software Engineer",
      applyUrl: "https://jobs.lever.co/toptal/abc/apply",
    });
  });
});
