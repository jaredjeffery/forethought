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
  column?: "Analysis" | "Leading Indicators" | "Forecaster Spotlight" | "Farfield Blog";
  visualKind?:
    | "oil-volatility"
    | "africa-gdp"
    | "satellite-crops"
    | "leading-indicators"
    | "forecaster-spotlight"
    | "source-record"
    | "gdp-revisions"
    | "scoring";
  prominence?: "lead" | "top" | "minor";
  publishedAt: string;
  readingTime: string;
  sections: ContentSection[];
}

export const articles: PublicContentItem[] = [
  {
    slug: "oil-price-forecast-volatility",
    title: "Oil price forecasts are a test of humility",
    dek: "Why crude price calls swing so sharply, and what Farfield would track before trusting a forecaster's edge.",
    label: "Analysis",
    tag: "Oil prices",
    column: "Analysis",
    visualKind: "oil-volatility",
    prominence: "lead",
    publishedAt: "2026-05-02",
    readingTime: "6 min",
    sections: [
      {
        heading: "The problem with single-point calls",
        body: [
          "Oil forecasts can look precise while hiding huge uncertainty. Supply shocks, OPEC decisions, inventory cycles, shipping costs, currency moves, and demand scares can all push the same benchmark in different directions.",
          "A Farfield oil page should eventually show the forecast path, the consensus path, the dispersion band, and how often each forecaster updated when the story changed. The public version can tease that structure without exposing paid values.",
        ],
      },
      {
        heading: "What to measure",
        body: [
          "Accuracy matters, but so does reaction speed. A forecaster who revises quickly after a supply shock may be more useful than one whose annual average happens to land close by chance.",
          "That means Farfield should track horizons, update frequency, missed turning points, and whether the forecast beat a simple consensus benchmark.",
        ],
      },
      {
        heading: "How this becomes a product",
        body: [
          "The public article can explain the forecasting problem. Subscriber modules can carry the live forecast values, consensus history, dispersion, and forecaster-by-forecaster comparisons.",
        ],
      },
    ],
  },
  {
    slug: "forecasting-gdp-in-african-states",
    title: "Why GDP is harder to forecast in many African states",
    dek: "Informal activity, commodity exposure, fiscal shocks, and revision cycles can make a clean growth call deceptively hard.",
    label: "Analysis",
    tag: "African growth",
    column: "Analysis",
    visualKind: "africa-gdp",
    prominence: "top",
    publishedAt: "2026-05-02",
    readingTime: "7 min",
    sections: [
      {
        heading: "The data problem",
        body: [
          "Growth forecasts are harder when a large share of activity is informal, survey coverage is thin, or national accounts are revised in large steps. The first release may tell a different story from the latest history.",
          "For Farfield, that makes source provenance essential. A score needs to say which actual release was used, not just whether the forecast looked right years later.",
        ],
      },
      {
        heading: "Commodity and fiscal shocks",
        body: [
          "Many economies face large swings from oil, metals, food prices, weather, public investment, and exchange-rate pressure. A good forecaster has to separate temporary shocks from changes in trend growth.",
        ],
      },
      {
        heading: "What readers should see",
        body: [
          "Public pages can explain the challenge and show actual-history charts. Subscriber pages can show who moved early, who stayed close to consensus, and who handled revisions best.",
        ],
      },
    ],
  },
  {
    slug: "satellite-data-crop-yields",
    title: "Satellite data is changing crop-yield forecasting",
    dek: "Vegetation signals, rainfall anomalies, and planting calendars are becoming early inputs for agricultural output calls.",
    label: "Leading Indicators",
    tag: "Agriculture",
    column: "Leading Indicators",
    visualKind: "satellite-crops",
    prominence: "top",
    publishedAt: "2026-05-02",
    readingTime: "5 min",
    sections: [
      {
        heading: "Why satellites help",
        body: [
          "Crop forecasts often move before official output data arrives. Satellite vegetation measures, rainfall anomalies, heat stress, and sowing progress can give forecasters a live read on supply risk.",
          "Those signals are not a forecast by themselves. They are inputs that need to be combined with acreage, policy, logistics, and demand data.",
        ],
      },
      {
        heading: "A Farfield use case",
        body: [
          "A subscriber view could compare crop-output forecasts with public weather signals and later actuals. The public article can explain the signal without exposing private forecast values.",
        ],
      },
      {
        heading: "What to watch",
        body: [
          "The strongest indicators may differ by crop and country. Maize, wheat, rice, and soy each need different calendars, source choices, and scoring windows.",
        ],
      },
    ],
  },
  {
    slug: "leading-indicators-shipping-and-freight",
    title: "Leading Indicators: shipping stress before inflation prints",
    dek: "Freight rates, port delays, and delivery times can warn of price pressure before official CPI data arrives.",
    label: "Leading Indicators",
    tag: "Inflation",
    column: "Leading Indicators",
    visualKind: "leading-indicators",
    prominence: "minor",
    publishedAt: "2026-05-02",
    readingTime: "4 min",
    sections: [
      {
        heading: "The signal",
        body: [
          "Freight costs and supplier delivery times can move before consumer prices. They are especially useful when energy costs, exchange rates, and import demand are also shifting.",
        ],
      },
      {
        heading: "The warning",
        body: [
          "A signal is not a model. Shipping pressure can fade before it reaches consumers, or pass through differently by country depending on subsidies, taxes, and currency moves.",
        ],
      },
      {
        heading: "How Farfield can use it",
        body: [
          "A regular Leading Indicators column can explain the signal publicly, then connect subscribers to the forecast records and consensus moves that followed.",
        ],
      },
    ],
  },
  {
    slug: "forecaster-spotlight-public-institution-benchmarks",
    title: "Forecaster Spotlight: why public institutions make useful benchmarks",
    dek: "IMF, OECD, ECB, World Bank, and central-bank forecasts help set a baseline before independent analysts join the market.",
    label: "Forecaster Spotlight",
    tag: "Institutions",
    column: "Forecaster Spotlight",
    visualKind: "forecaster-spotlight",
    prominence: "top",
    publishedAt: "2026-05-02",
    readingTime: "5 min",
    sections: [
      {
        heading: "The benchmark role",
        body: [
          "Public institutions are not just data sources. Their forecasts give Farfield a baseline record that independent forecasters can later beat, match, or diverge from.",
        ],
      },
      {
        heading: "What profiles should show",
        body: [
          "A public profile can show coverage, source vintages, regions, variables, and sample size. Detailed error metrics and comparison tables should wait for subscriber access.",
        ],
      },
      {
        heading: "A recurring format",
        body: [
          "Forecaster Spotlight can become a regular feature: one profile, one chart, one variable focus, and a clear note on what is public versus paid.",
        ],
      },
    ],
  },
  {
    slug: "first-public-forecast-record",
    title: "The first public forecast record",
    dek: "What can be checked today across IMF, OECD, ECB, and World Bank source history.",
    label: "Farfield Blog",
    tag: "Forecast record",
    column: "Farfield Blog",
    visualKind: "source-record",
    prominence: "minor",
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
    column: "Farfield Blog",
    visualKind: "gdp-revisions",
    prominence: "minor",
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
    label: "Farfield Blog",
    tag: "Scoring",
    column: "Farfield Blog",
    visualKind: "scoring",
    prominence: "minor",
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
