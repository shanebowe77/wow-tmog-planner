import type { Metadata } from "next";

import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: `Privacy policy for ${siteConfig.name}.`,
};

/** Kept deliberately plain-English. Must be updated before accounts /
 * Battle.net login ship (Phase 5) — see the compliance checklist in
 * docs/PLAN.md. */
export default function PrivacyPage() {
  return (
    <article className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-20 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_p]:leading-relaxed [&_p]:text-muted-foreground [&_ul]:list-disc [&_ul]:pl-6 [&_li]:leading-relaxed [&_li]:text-muted-foreground">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          Privacy policy
        </h1>
        <p className="text-sm">Last updated: July 5, 2026</p>
      </header>

      <section className="flex flex-col gap-3">
        <h2>The short version</h2>
        <p>
          {siteConfig.name} is a free, non-commercial fan project. Today it has
          no user accounts and collects no personal data. We set no cookies, run
          no ads, and use no analytics or tracking.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2>What we store today</h2>
        <p>
          Nothing about you. Our database holds only World of Warcraft game
          data (item and appearance metadata) used to power the catalog. There
          is no sign-up, no profile, and nothing you enter is saved.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2>Hosting and server logs</h2>
        <p>
          The site is hosted on Vercel, and our database runs on Supabase. Like
          almost every web host, Vercel keeps short-lived technical request
          logs (such as IP address and user agent) that we may see when
          operating the site or investigating abuse. We do not use these logs
          to identify or profile visitors.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2>Third-party game assets</h2>
        <p>
          Some pages will load item icons and 3D character models directly from
          Wowhead&apos;s and Blizzard&apos;s content delivery networks. When
          that happens, your browser requests those files from their servers,
          which see your IP address and user agent the same way they would if
          you visited their sites directly.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2>What will change later</h2>
        <p>
          Planned features will add optional accounts, saved outfits, and a
          Battle.net collection import. When those ship, this policy will be
          updated first to spell out exactly what is stored. Two commitments we
          can already make:
        </p>
        <ul>
          <li>
            Accounts and saved data will always be optional — browsing and
            outfit building will work without logging in.
          </li>
          <li>
            Any data imported from the Blizzard API (such as which appearances
            you have collected) will be automatically deleted after at most 30
            days, per Blizzard&apos;s API policy.
          </li>
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2>Contact</h2>
        <p>
          Questions or concerns? Open an issue on{" "}
          <a
            href={siteConfig.githubUrl}
            rel="noreferrer"
            target="_blank"
            className="underline underline-offset-2 hover:text-foreground"
          >
            GitHub
          </a>
          .
        </p>
      </section>
    </article>
  );
}
