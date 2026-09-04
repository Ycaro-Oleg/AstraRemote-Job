import { describe, expect, it } from "vitest";
import { fingerprint } from "./fingerprint.ts";

describe("fingerprint", () => {
  it("collapses the same job posted on two boards", () => {
    expect(fingerprint("GitLab", "Backend Engineer (Ruby)")).toBe(
      fingerprint("gitlab", "Backend  Engineer (Ruby)"),
    );
  });
});
