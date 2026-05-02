// Public pricing page describing Farfield subscriber value before Stripe checkout exists.

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { SectionLabel } from "@/components/ui/SectionLabel";

export const revalidate = 3600;

const planCards = [
  {
    name: "Public reader",
    price: "Free",
    dek: "For readers who want the public record, articles, actuals, and methodology.",
    cta: "Start reading",
    href: "/articles",
    featured: false,
    items: [
      "Farfield editorial and Leading Indicators",
      "Actuals-only variable pages",
      "Institution and forecaster profiles",
      "Methodology and source notes",
      "Locked previews of premium modules",
    ],
  },
  {
    name: "Farfield subscriber",
    price: "Request access",
    dek: "For analysts, investors, policy teams, and operators who need the forecast record itself.",
    cta: "Request access",
    href: "/signin",
    featured: true,
    items: [
      "Current consensus charts",
      "Consensus as-of history",
      "Forecaster-by-forecaster series",
      "Vintage changes and revision paths",
      "Premium rankings, dispersion, and exports",
      "Watchlists and alerts planned",
    ],
  },
  {
    name: "Team access",
    price: "Talk to us",
    dek: "For organisations that want shared access, exports, and coverage across teams.",
    cta: "Register interest",
    href: "/signin",
    featured: false,
    items: [
      "Multiple seats",
      "Shared watchlists",
      "Export and API access planning",
      "Coverage review by variable and region",
      "Early input on subscriber workflow",
    ],
  },
];

const comparisonRows = [
  ["Actual outcomes and source labels", "Included", "Included"],
  ["Articles and public methodology", "Included", "Included"],
  ["Forecast coverage counts", "Included", "Included"],
  ["Current consensus values", "Locked", "Included"],
  ["Full forecast time series", "Locked", "Included"],
  ["Vintage history", "Locked", "Included"],
  ["Forecaster-by-forecaster comparisons", "Locked", "Included"],
  ["Exports and downloads", "Locked", "Included"],
];

export default function PricingPage() {
  return (
    <div className="space-y-14">
      <section className="grid gap-8 border-b border-border pb-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
        <div>
          <SectionLabel>Pricing</SectionLabel>
          <h1
            className="text-5xl leading-tight tracking-tight text-ink"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Public trust first. Subscriber data when the record is ready.
          </h1>
        </div>
        <div>
          <p className="text-lg leading-8 text-muted">
            Farfield is in public showcase mode. The public site explains what happened,
            who forecasts it, and how the record is kept. Subscriber access will unlock
            what the market thinks now.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/signin"
              className="inline-flex items-center rounded-[10px] bg-accent px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-dark"
            >
              Request access
            </Link>
            <Link
              href="/variables"
              className="inline-flex items-center rounded-[10px] border border-border px-5 py-3 text-sm font-semibold text-ink transition-colors hover:border-accent hover:text-accent"
            >
              Browse variables
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {planCards.map((plan) => (
          <Card
            key={plan.name}
            padding="lg"
            raised={plan.featured}
            className={`flex h-full flex-col ${plan.featured ? "border-l-4 border-l-accent" : ""}`}
          >
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-accent">
                {plan.name}
              </p>
              <p
                className="mt-4 text-4xl leading-none text-ink"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {plan.price}
              </p>
              <p className="mt-4 text-sm leading-6 text-muted">{plan.dek}</p>
            </div>
            <ul className="mt-7 space-y-3">
              {plan.items.map((item) => (
                <li key={item} className="flex gap-3 text-sm leading-6 text-ink">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <Link
              href={plan.href}
              className={`mt-auto inline-flex justify-center rounded-[10px] px-5 py-3 text-sm font-semibold transition-colors ${
                plan.featured
                  ? "bg-accent text-white hover:bg-accent-dark"
                  : "border border-border text-ink hover:border-accent hover:text-accent"
              }`}
            >
              {plan.cta}
            </Link>
          </Card>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.75fr_1.25fr]">
        <div>
          <SectionLabel>Access Boundary</SectionLabel>
          <h2
            className="text-3xl leading-tight tracking-tight text-ink"
            style={{ fontFamily: "var(--font-display)" }}
          >
            What stays public, what becomes subscriber-only
          </h2>
          <p className="mt-4 text-base leading-7 text-muted">
            The public product builds confidence in Farfield. The subscriber product carries
            the live analytical dataset.
          </p>
        </div>

        <Card padding="none" className="overflow-hidden">
          <div className="grid grid-cols-[1.4fr_0.8fr_0.8fr] border-b border-border bg-bg px-4 py-3 text-xs font-bold uppercase tracking-widest text-muted">
            <span>Feature</span>
            <span>Public</span>
            <span>Subscriber</span>
          </div>
          <div className="divide-y divide-border">
            {comparisonRows.map(([feature, publicState, subscriberState]) => (
              <div
                key={feature}
                className="grid grid-cols-[1.4fr_0.8fr_0.8fr] gap-3 px-4 py-3 text-sm"
              >
                <span className="font-medium text-ink">{feature}</span>
                <span className={publicState === "Locked" ? "text-muted" : "text-signal-green"}>
                  {publicState}
                </span>
                <span className="font-semibold text-ink">{subscriberState}</span>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {[
          ["For readers", "Read the public analysis and inspect actuals without creating an account."],
          ["For forecasters", "Use the public record to see where independent analysis can stand out later."],
          ["For buyers", "Request early access to the consensus, vintage, ranking, and export layer."],
        ].map(([title, body]) => (
          <Card key={title} padding="md">
            <p className="text-sm font-semibold text-ink">{title}</p>
            <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
          </Card>
        ))}
      </section>
    </div>
  );
}
