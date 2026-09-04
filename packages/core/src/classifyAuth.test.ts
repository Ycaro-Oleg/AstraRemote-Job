import { describe, expect, it } from "vitest";
import { classifyAuth, classifyHiringGeo, isExpired } from "./classifyAuth.ts";

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

describe("classifyHiringGeo", () => {
  it("skips United States location even if the JD says remote", () => {
    expect(
      classifyHiringGeo({
        title: "Senior Rails Engineer",
        location: "United States",
        description: "Remote worldwide team",
      }),
    ).toBe("us_auth_only");
  });

  it("skips Spain-only locations and title suffixes", () => {
    expect(
      classifyHiringGeo({
        title: "Backend Engineer - Platform | Spain | Remote",
        location: "Spain",
        description: "Ruby",
      }),
    ).toBe("country_locked");
  });

  it("skips US timezone lists that exclude Brazil", () => {
    expect(
      classifyHiringGeo({
        title: "Tech Lead",
        location: "USA, Canada, USA timezones",
        description: "Rails",
      }),
    ).toBe("us_auth_only");
  });

  it("keeps Brazil and LATAM", () => {
    expect(
      classifyHiringGeo({
        title: "Ruby on Rails Developer",
        location: "Brazil",
        description: "Remote",
      }),
    ).toBe("worldwide");
    expect(
      classifyHiringGeo({
        title: "Rails Engineer",
        location: "LATAM, Europe, USA",
        description: "",
      }),
    ).toBe("worldwide");
  });

  it("keeps timezone windows that include Fortaleza (UTC-3)", () => {
    expect(
      classifyHiringGeo({
        title: "Rails",
        location: "Brazil, tz:-5,-4,-3,-2",
        description: "",
      }),
    ).toBe("worldwide");
  });

  it("does not treat 'Global Marts' in a title as worldwide", () => {
    expect(
      classifyHiringGeo({
        title: "Senior Backend Engineer - Global Marts",
        location: "Helsinki, Finland; Stockholm, Sweden",
        description: "",
      }),
    ).toBe("country_locked");
  });

  it("skips EU office cities", () => {
    expect(
      classifyHiringGeo({
        title: "Backend Engineer",
        location: "Berlin, Barcelona",
        description: "Rails",
      }),
    ).toBe("country_locked");
    expect(
      classifyHiringGeo({
        title: "Software Engineer",
        location: "London",
        description: "",
      }),
    ).toBe("country_locked");
  });
});

describe("isExpired", () => {
  const now = new Date("2026-09-04T12:00:00Z");

  it("drops postings older than 35 days", () => {
    expect(isExpired(new Date("2026-07-01T00:00:00Z"), null, now)).toBe(true);
    expect(isExpired(new Date("2026-08-20T00:00:00Z"), null, now)).toBe(false);
  });

  it("drops when expiry is in the past", () => {
    expect(isExpired(new Date("2026-09-01T00:00:00Z"), new Date("2026-09-03T00:00:00Z"), now)).toBe(
      true,
    );
  });
});
