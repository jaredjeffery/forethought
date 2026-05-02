// Static public editorial and methodology content until the content CMS/schema arrives.

export interface ContentSection {
  heading: string;
  body: string[];
}

export interface PublicContentItem {
  slug: string;
  title: string;
  dek: string;
  label: string;
  tag: string;
  publishedAt: string;
  readingTime: string;
  sections: ContentSection[];
}

export const articles: PublicContentItem[] = [
  {
    slug: "first-public-forecast-record",
    title: "The first public forecast record",
    dek: "What can be checked today across IMF, OECD, ECB, and World Bank source history.",
    label: "Launch brief",
    tag: "Forecast record",
    publishedAt: "2026-05-02",
    readingTime: "4 min",
    sections: [
      {
        heading: "What is live now",
        body: [
          "Farfield's first public record is built from institutional forecast releases and the source documents that produced them. Each imported row keeps its publication vintage, source label, and target period so later scoring can be traced back to the exact dataset used.",
          "The public site exposes coverage, source depth, actual outcomes, and trust signals. It does not expose current forecast values or consensus values on public pages.",
        ],
      },
      {
        heading: "Why source documents matter",
        body: [
          "Economic forecast datasets change format, variable names, and historical values over time. Farfield records source documents and ingestion runs so a future score is not just a number, but a repeatable statement about a specific forecast and a specific actual release.",
        ],
      },
      {
        heading: "What comes next",
        body: [
          "The next public layer is a clearer set of variable explainers and institution profiles. Subscriber pages will add current consensus, vintage history, dispersion, exports, and forecaster-by-forecaster comparisons after billing and plan checks are in place.",
        ],
      },
    ],
  },
  {
    slug: "why-gdp-surprises-are-not-all-equal",
    title: "Why GDP surprises are not all equal",
    dek: "A plain-English look at horizons, revisions, and why the same miss can mean different things.",
    label: "Variable explainer",
    tag: "GDP growth",
    publishedAt: "2026-05-02",
    readingTime: "5 min",
    sections: [
      {
        heading: "The target period matters",
        body: [
          "A forecast for next year made in January is not the same test as a forecast for next year made in October. Farfield keeps forecast_made_at separate from ingestion time so the scoring engine can compare forecasts by horizon.",
        ],
      },
      {
        heading: "Revisions change the story",
        body: [
          "GDP actuals are often revised after the first release. A forecaster may look accurate against the latest history but miss the first release that markets and policy teams actually saw at the time. Farfield stores actual vintages so those questions can be answered separately.",
        ],
      },
      {
        heading: "Consensus is a benchmark, not the whole product",
        body: [
          "Consensus helps users see the center of the forecast distribution. Public pages can show that consensus exists and how much coverage supports it, while subscriber pages hold the values, dispersion, and vintage changes.",
        ],
      },
    ],
  },
  {
    slug: "actuals-before-rankings",
    title: "Actuals before rankings",
    dek: "Why Farfield is building the data integrity layer before publishing detailed score tables.",
    label: "Data note",
    tag: "Scoring",
    publishedAt: "2026-05-02",
    readingTime: "3 min",
    sections: [
      {
        heading: "Credibility starts with the join",
        body: [
          "Forecast rankings only matter if each forecast is joined to the right actual. Farfield records the forecast vintage, actual vintage, and scoring methodology version before turning results into public trust signals.",
        ],
      },
      {
        heading: "Public trust, paid detail",
        body: [
          "The public product should prove that the record exists without giving away the paid analytical dataset. That means coverage counts, methodology, source labels, and non-sensitive scoring signals come first.",
        ],
      },
      {
        heading: "When detailed rankings appear",
        body: [
          "Detailed error metrics, horizon-specific rankings, and forecaster-by-forecaster comparisons belong in the subscriber product once access control, billing, and leakage tests are in place.",
        ],
      },
    ],
  },
];

export const methodologyNotes: PublicContentItem[] = [
  {
    slug: "weo-national-authority-actuals",
    title: "How Farfield treats WEO actuals",
    dek: "National-authority metadata, fiscal-year mapping, and the role of first-release scoring.",
    label: "Methodology",
    tag: "Actuals",
    publishedAt: "2026-05-02",
    readingTime: "6 min",
    sections: [
      {
        heading: "Default rule",
        body: [
          "For the core cross-country macro panel, Farfield prefers WEO-carried observations that are identified as historical or actual data and can be mapped to a national-authority or equivalent source status. WEO is the carrier dataset, not the economic authority itself.",
          "World Bank rows remain useful as references and fallback exceptions, but they are not the default scoring baseline for core macro variables when WEO-carried national-authority actuals are available.",
        ],
      },
      {
        heading: "Fiscal years",
        body: [
          "Some economies report fiscal-year data. Farfield maps fiscal years conservatively, using explicit WEO metadata and methodology notes where available rather than inferring target years from the table layout alone.",
        ],
      },
      {
        heading: "Score links",
        body: [
          "Each score should point to the forecast row, the exact actual vintage, and the scoring methodology version. That is what lets first-release and latest-release scoring coexist later without overwriting the record.",
        ],
      },
    ],
  },
  {
    slug: "consensus-as-of-snapshots",
    title: "Consensus as-of snapshots",
    dek: "How Farfield stores what the market believed at a point in time without overwriting history.",
    label: "Methodology",
    tag: "Consensus",
    publishedAt: "2026-05-02",
    readingTime: "4 min",
    sections: [
      {
        heading: "The key question",
        body: [
          "Consensus is not just a variable, target period, and value. The useful question is: what did the included forecasters imply as of a specific date for a specific target period?",
        ],
      },
      {
        heading: "Snapshot fields",
        body: [
          "Farfield consensus rows include as_of_date, methodology_version, included_forecast_count, and n_forecasters. New runs create historical snapshots instead of replacing the record with a latest-only row.",
        ],
      },
      {
        heading: "Public access",
        body: [
          "Public pages can state that consensus exists and show coverage counts. The consensus values, time series, and revision path are subscriber data unless a source is explicitly public and legally safe to show.",
        ],
      },
    ],
  },
  {
    slug: "public-leakage-boundary",
    title: "Public leakage boundary",
    dek: "What public and free users can see before subscriber access is enabled.",
    label: "Methodology",
    tag: "Access",
    publishedAt: "2026-05-02",
    readingTime: "4 min",
    sections: [
      {
        heading: "Allowed public fields",
        body: [
          "Public pages may show actuals, source labels, coverage counts, institution profiles, methodology notes, and locked premium modules. They can also show that a variable has forecast coverage without exposing the values.",
        ],
      },
      {
        heading: "Subscriber fields",
        body: [
          "Forecast values, paid consensus values, private forecaster values, vintage history, exports, and reconstructive chart data require subscriber access after authentication and plan checks.",
        ],
      },
      {
        heading: "Testing rule",
        body: [
          "Leakage tests should inspect HTML, JSON responses, chart props, metadata, and hydration payloads. If a public route contains sampled forecast values or detailed score fields, it fails.",
        ],
      },
    ],
  },
];

export function findArticle(slug: string) {
  return articles.find((article) => article.slug === slug);
}

export function findMethodologyNote(slug: string) {
  return methodologyNotes.find((note) => note.slug === slug);
}
