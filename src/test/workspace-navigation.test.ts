import { describe, expect, it } from "vitest";
import { workspaceNavigationItems } from "@/features/workspace-navigation";

describe("Workspace navigation", () => {
  it("shows Community in the admin navigation", () => {
    expect(workspaceNavigationItems(true).map(([label]) => label)).toContain("Comunidade");
  });

  it("keeps Community in the student navigation", () => {
    expect(workspaceNavigationItems(false).map(([label]) => label)).toContain("Comunidade");
  });
});
