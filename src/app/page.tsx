import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";

const plannedFeatures = [
  {
    title: "Appearance catalog",
    description:
      "Every transmoggable appearance in the game, searchable and filterable by slot, armor type, color, and source.",
  },
  {
    title: "3D outfit builder",
    description:
      "Assemble an outfit piece by piece and preview it on a live 3D character model, then share it with a link.",
  },
  {
    title: "AI outfit planner",
    description:
      "Describe a theme — “dress me like a dark ranger” — and get a complete, matching outfit back.",
  },
] as const;

export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-12 px-6 py-20">
      <section className="flex flex-col items-start gap-4">
        <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
          Under construction — no game data yet
        </span>
        <h1 className="text-4xl font-semibold tracking-tight">
          {siteConfig.name}
        </h1>
        <p className="max-w-prose text-lg text-muted-foreground">
          {siteConfig.description}
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Button disabled>Browse appearances — coming soon</Button>
          <a
            href={siteConfig.githubUrl}
            rel="noreferrer"
            target="_blank"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Follow along on GitHub
          </a>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {plannedFeatures.map((feature) => (
          <Card key={feature.title}>
            <CardHeader>
              <CardTitle>{feature.title}</CardTitle>
              <CardDescription>{feature.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </section>

      <p className="text-sm text-muted-foreground">
        This site is being built in the open. Right now it is a skeleton: the
        catalog, 3D preview, and planner above are planned, not live.
      </p>
    </div>
  );
}
