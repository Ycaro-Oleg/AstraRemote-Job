import { describe, expect, it } from "vitest";
import { classifyTitle, isHardSkip } from "./classifyTitle.ts";

describe("classifyTitle", () => {
  it("keeps Rails engineer", () => {
    expect(classifyTitle("Senior Rails Engineer", "Ruby on Rails backend", "rails")).toBe("rails");
  });

  it("keeps backend software engineer", () => {
    expect(classifyTitle("Backend Software Engineer", "Node and Postgres", "remote_first")).toBe(
      "backend",
    );
  });

  it("keeps generic software engineer as backend", () => {
    expect(classifyTitle("Software Engineer", "Generalist product role", "remote_first")).toBe(
      "backend",
    );
  });

  it("skips staff", () => {
    expect(classifyTitle("Staff Software Engineer", "Ruby", "rails")).toBe("no");
  });

  it("skips intern", () => {
    expect(classifyTitle("Software Engineer Intern", "Rails", "rails")).toBe("no");
  });

  it("skips frontend-only", () => {
    expect(classifyTitle("Frontend Engineer", "React", "remote_first")).toBe("no");
  });

  it("keeps full-stack even with frontend in the title", () => {
    expect(classifyTitle("Full Stack Engineer (React + Rails)", "Rails", "rails")).toBe("rails");
  });

  it("keeps marketplace join titles only on marketplace boards", () => {
    expect(classifyTitle("Apply to join our network", "Developers wanted", "marketplace")).toBe(
      "marketplace",
    );
    expect(classifyTitle("Apply to join our network", "Developers wanted", "rails")).toBe("no");
  });
});

describe("isHardSkip", () => {
  it("skips bad fit and auth-only geos", () => {
    expect(isHardSkip("no", "unknown")).toBe(true);
    expect(isHardSkip("rails", "us_auth_only")).toBe(true);
    expect(isHardSkip("backend", "eu_permit_only")).toBe(true);
    expect(isHardSkip("rails", "worldwide")).toBe(false);
  });
});
