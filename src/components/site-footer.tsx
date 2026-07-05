import Link from "next/link";

import { blizzardNotice, credits, siteConfig } from "@/lib/site";

/** Compliance footer required on every page (docs/PLAN.md checklist):
 * Blizzard non-affiliation notice + data/viewer credits. Rendered once in the
 * root layout. */
export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-6 py-8 text-xs text-muted-foreground">
        <p>{blizzardNotice}</p>
        <p>
          {credits.map((credit, i) => (
            <span key={credit.label}>
              {i > 0 && " · "}
              <a
                href={credit.href}
                rel="noreferrer"
                target="_blank"
                className="underline underline-offset-2 hover:text-foreground"
              >
                {credit.label}
              </a>{" "}
              ({credit.role})
            </span>
          ))}
        </p>
        <p className="flex gap-4">
          <Link
            href="/legal/privacy"
            className="underline underline-offset-2 hover:text-foreground"
          >
            Privacy policy
          </Link>
          <a
            href={siteConfig.githubUrl}
            rel="noreferrer"
            target="_blank"
            className="underline underline-offset-2 hover:text-foreground"
          >
            Source on GitHub
          </a>
        </p>
      </div>
    </footer>
  );
}
