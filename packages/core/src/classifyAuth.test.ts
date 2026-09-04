import { describe, expect, it } from "vitest";
import { classifyAuth } from "./classifyAuth.ts";

describe("classifyAuth", () => {
  it("skips US authorization without sponsorship", () => {
    expect(
      classifyAuth("Must be authorized to work in the United States without visa sponsorship."),
    ).toBe("us_auth_only");
  });

  it("skips we do not sponsor", () => {
    expect(classifyAuth("We do not sponsor visas now or in the future.")).toBe("us_auth_only");
  });

  it("skips green card required", () => {
    expect(classifyAuth("Citizenship or permanent residency / green card required.")).toBe(
      "us_auth_only",
    );
  });

  it("skips US person language", () => {
    expect(classifyAuth("This role is open to US persons only.")).toBe("us_auth_only");
  });

  it("skips UK right to work", () => {
    expect(classifyAuth("You must have the right to work in the UK.")).toBe("eu_permit_only");
  });

  it("skips EU work permit phrasing", () => {
    expect(classifyAuth("Candidates must have an EU work permit.")).toBe("eu_permit_only");
  });

  it("keeps remote worldwide", () => {
    expect(classifyAuth("Remote worldwide. Work from anywhere. No office required.")).toBe(
      "worldwide",
    );
  });

  it("skip wins over worldwide if both appear", () => {
    expect(
      classifyAuth(
        "Remote worldwide, but you must be authorized to work in the United States without sponsorship.",
      ),
    ).toBe("us_auth_only");
  });

  it("returns unknown when silent", () => {
    expect(classifyAuth("Build APIs in Ruby on Rails. Remote.")).toBe("unknown");
  });
});
