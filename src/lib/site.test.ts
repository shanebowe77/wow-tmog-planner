import { describe, expect, it } from "vitest";

import { blizzardNotice, credits, siteConfig } from "@/lib/site";

// The exact wording is a compliance requirement (docs/PLAN.md checklist);
// these tests guard against accidental edits.
describe("compliance strings", () => {
  it("keeps the Blizzard non-affiliation notice intact", () => {
    expect(blizzardNotice).toContain("World of Warcraft®");
    expect(blizzardNotice).toContain("Blizzard Entertainment®");
    expect(blizzardNotice).toContain(
      "not affiliated with or endorsed by Blizzard Entertainment",
    );
  });

  it("credits both data sources", () => {
    const labels = credits.map((c) => c.label);
    expect(labels).toContain("wago.tools");
    expect(labels).toContain("Wowhead");
  });

  it("describes the site as free and fan-made", () => {
    expect(siteConfig.description.toLowerCase()).toContain("free");
    expect(siteConfig.description.toLowerCase()).toContain("fan-made");
  });
});
