import { describe, expect, it } from "vitest";
import { fetchRemotive } from "./remotive.ts";

describe("fetchRemotive", () => {
  it("maps the public API shape", async () => {
    const body = JSON.stringify({
      jobs: [
        {
          id: 1,
          title: "Rails Engineer",
          company_name: "Acme",
          url: "https://remotive.com/remote-jobs/software-development/rails-engineer-1",
          description: "<p>Ruby on Rails</p>",
          candidate_required_location: "Worldwide",
          publication_date: "2026-09-01T00:00:00",
        },
      ],
    });
    const fetchFn: typeof fetch = async () => new Response(body, { status: 200 });
    const { postings } = await fetchRemotive("software-dev", fetchFn);
    expect(postings[0]).toMatchObject({
      externalId: "1",
      title: "Rails Engineer",
      company: "Acme",
      location: "Worldwide",
    });
    expect(postings[0]?.description).toContain("Ruby on Rails");
  });
});
