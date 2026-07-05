/** Site-wide constants, including legal wording required by the compliance
 * checklist in docs/PLAN.md. Change the legal strings only in lockstep with
 * that checklist. */

export const siteConfig = {
  name: "WoW Transmog Planner",
  description:
    "Browse every World of Warcraft transmog appearance, build outfits on a 3D character preview, and get AI outfit help. Free, fan-made, non-commercial.",
  githubUrl: "https://github.com/shanebowe77/wow-tmog-planner",
} as const;

export const blizzardNotice =
  "World of Warcraft® and Blizzard Entertainment® are trademarks or registered trademarks of Blizzard Entertainment, Inc. This site is a fan project and is not affiliated with or endorsed by Blizzard Entertainment.";

export const credits = [
  {
    label: "wago.tools",
    href: "https://wago.tools",
    role: "game data",
  },
  {
    label: "Wowhead",
    href: "https://www.wowhead.com",
    role: "3D model viewer",
  },
] as const;
