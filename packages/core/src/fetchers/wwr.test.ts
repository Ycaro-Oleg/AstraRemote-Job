import { describe, expect, it } from "vitest";
import { fetchWwr } from "./wwr.ts";

const RSS = `<?xml version="1.0"?>
<rss><channel>
<item>
  <title>Grafana Labs: Backend Engineer</title>
  <link>https://weworkremotely.com/remote-jobs/grafana-labs-backend-engineer</link>
  <description><![CDATA[<p>Ruby welcome</p>]]></description>
  <pubDate>Thu, 03 Sep 2026 12:00:00 +0000</pubDate>
</item>
</channel></rss>`;

describe("fetchWwr", () => {
  it("parses company and title from RSS", async () => {
    const fetchFn: typeof fetch = async () => new Response(RSS, { status: 200 });
    const { postings } = await fetchWwr("backend", fetchFn);
    expect(postings[0]).toMatchObject({
      company: "Grafana Labs",
      title: "Backend Engineer",
      applyUrl: "https://weworkremotely.com/remote-jobs/grafana-labs-backend-engineer",
    });
  });
});
