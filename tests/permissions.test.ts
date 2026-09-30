import { describe, expect, it } from "vitest";
import { can } from "@/lib/permissions/roles";

describe("role permissions", () => {
  it("lets owners and admins manage brand, company and team", () => {
    for (const role of ["owner", "admin"] as const) {
      expect(can(role, "brand:update")).toBe(true);
      expect(can(role, "company:update")).toBe(true);
      expect(can(role, "team:manage")).toBe(true);
    }
  });
  it("limits members to creating documents", () => {
    expect(can("member", "document:create")).toBe(true);
    expect(can("member", "brand:update")).toBe(false);
    expect(can("member", "client:delete")).toBe(false);
  });
  it("denies everything when there is no role", () => {
    expect(can(null, "document:create")).toBe(false);
    expect(can(undefined, "brand:update")).toBe(false);
  });
});
