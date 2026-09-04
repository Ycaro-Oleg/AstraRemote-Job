import { describe, expect, it } from "vitest";
import { detectAtsApplyUrl } from "./detectAts.ts";

describe("detectAtsApplyUrl", () => {
  it("finds a Greenhouse apply URL inside a LinkedIn description", () => {
    const found = detectAtsApplyUrl(
      "Apply at https://job-boards.greenhouse.io/gitlab/jobs/123 please",
    );
    expect(found).toEqual({
      ats: "greenhouse",
      url: "https://job-boards.greenhouse.io/gitlab/jobs/123",
    });
  });
});
