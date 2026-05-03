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
    title: "Oil price forecasts are mostly noise. Here is what isn't.",
    dek: "Why most crude price calls fail, what the few useful forecasters do differently, and what to track instead of the headline number.",
    label: "Analysis",
    tag: "Oil prices",
    column: "Analysis",
    visualKind: "oil-volatility",
    prominence: "lead",
    publishedAt: "2026-05-02",
    readingTime: "6 min",
    sections: [
      {
        heading: "The headline number is the wrong target",
        body: [
          "Brent has spent the last twenty years swinging from twenty-six dollars to one hundred and forty-seven and back. Across every major shop publishing twelve-month-ahead forecasts, the median absolute error sits comfortably above twelve dollars per barrel. That means the average forecaster, on the average year, is off by roughly fifteen percent of the spot price they were trying to call.",
          "And that is the median. The tails are worse. In 2008, 2014, 2020, and 2022, consensus missed the eventual annual average by more than twenty-five dollars. None of these were unforecastable in hindsight — supply shocks, OPEC pivots, demand collapses each had visible early signals — but the consensus moved late and small, the way it always does when forecasters are anchored to the previous year's price.",
        ],
      },
      {
        heading: "What the useful forecasters actually do",
        body: [
          "The forecasters who consistently beat consensus are not the ones with the cleverest single-point calls. They are the ones who revise quickly when inventories, freight rates, or refining margins move; who publish ranges rather than points; and whose ranges actually widen when uncertainty rises rather than staying the same out of institutional habit.",
          "On a public scoring layer, this shows up as three things: short-horizon errors that drop sharply when shocks arrive, dispersion that expands ahead of turning points, and revision quality — the share of revisions that move toward the eventual outturn rather than chasing the previous month's surprise.",
        ],
      },
      {
        heading: "What to track if you actually need to know",
        body: [
          "Stop reading single-point year-ahead forecasts as if they mean anything. Track instead: the gap between the median and the 25th–75th percentile of public forecasts (a proxy for genuine uncertainty), the date of each forecaster's last revision, and the reaction time after the last OPEC meeting or major inventory release.",
          "On Farfield's subscriber pages, all three of those become first-class signals. The public version explains the problem and lets you see who is even in the record. The pricing page covers the rest.",
        ],
      },
    ],
  },
  {
    slug: "forecasting-gdp-in-african-states",
    title: "Why GDP is genuinely harder to forecast in many African economies",
    dek: "Informal activity, base-year rebases, and revision cycles do most of the damage. Forecasters who beat consensus understand the data structure as well as the macro story.",
    label: "Analysis",
    tag: "African growth",
    column: "Analysis",
    visualKind: "africa-gdp",
    prominence: "top",
    publishedAt: "2026-05-02",
    readingTime: "7 min",
    sections: [
      {
        heading: "Three structural problems, not one",
        body: [
          "Forecasting Ghanaian or Kenyan or Nigerian GDP is harder than forecasting Germany&rsquo;s, but not for the reason most casual observers assume. The challenge is not that these economies are more volatile in the abstract. It is that three distinct data problems compound: high informality changes what the official series even measures; periodic base-year rebases shift the level of historical GDP by ten to twenty percent overnight; and first-release national accounts can move five percentage points or more between the initial print and the third or fourth revision.",
          "A forecaster who scores their 2023 Nigerian GDP forecast against the latest 2026 vintage of history is not measuring the same thing they were measuring against the first release. Both numbers are defensible. Choosing between them is a methodology decision, not a technicality.",
        ],
      },
      {
        heading: "Commodity exposure is the cleanest signal",
        body: [
          "For oil-exporting economies, fiscal pressure, FX availability, and growth itself all move with crude. For metals exporters, the lag is longer but the pass-through is sharper. For diversified frontier economies — Kenya, C&ocirc;te d&rsquo;Ivoire, Senegal — the relevant signal is closer to imported food and fuel costs than to export commodity prices.",
          "Forecasters who treat African GDP as one bucket lose information. The ones who segment by export concentration, exchange-rate regime, and food-import intensity tend to beat consensus on the first-release horizon, even when their full-year numbers eventually look unimpressive after revisions.",
        ],
      },
      {
        heading: "What a fair record looks like",
        body: [
          "The honest way to score forecasts in this environment is to show two parallel records: one against the first release of actuals (what was knowable in real time, including the noise), and one against the latest available release (what we now believe actually happened). Forecasters who do well on both are rare and worth following. Forecasters who only do well on the latest-release number are usually beating a moving target.",
          "Farfield&rsquo;s public methodology page commits to scoring against first-release actuals as the primary metric, with latest-release shown as a secondary benchmark. That choice is not neutral, and we explain why on the methodology page rather than burying it.",
        ],
      },
    ],
  },
  {
    slug: "satellite-data-crop-yields",
    title: "Satellite data has quietly become the most useful crop-yield input",
    dek: "NDVI, soil moisture anomalies, and planted-area imagery now lead official agricultural prints by months — for the forecasters who know how to read them.",
    label: "Leading Indicators",
    tag: "Agriculture",
    column: "Leading Indicators",
    visualKind: "satellite-crops",
    prominence: "top",
    publishedAt: "2026-05-02",
    readingTime: "5 min",
    sections: [
      {
        heading: "The signal that already works",
        body: [
          "Normalised Difference Vegetation Index — the green-ness of agricultural land, measured by satellites like Sentinel-2 and Landsat — has correlated with US corn and soy yields at well above 0.7 since the late 2000s. Soil moisture anomalies from SMAP push that further for rainfed crops. For the major Northern Hemisphere harvests, the satellite picture is essentially complete six to eight weeks before USDA&rsquo;s final yield estimate, and stable enough at three to four weeks before peak NDVI to support directional calls.",
          "What changed in the last five years is not the signal itself. It is access. NDVI composites used to require a remote-sensing team. They are now a public API call. The premium has shifted from collecting the data to interpreting it well.",
        ],
      },
      {
        heading: "The signal that doesn&rsquo;t",
        body: [
          "Satellite data is excellent at telling you about biomass on the ground. It is bad at telling you about acreage that has not been planted yet, about post-harvest losses, about quality grades, and about how a government will respond with export restrictions. For wheat in Russia, Australia, and Argentina, those non-satellite factors regularly dominate the eventual marketed surplus.",
          "The forecasters who have made satellite data work integrate it with planted-area surveys, weather model ensembles for the next twenty days, and a fairly cynical read on policy risk. The ones who treat it as a single magic input miss the same turning points as anyone else.",
        ],
      },
      {
        heading: "What to actually watch",
        body: [
          "For the 2026 Northern Hemisphere harvest: corn-belt NDVI versus the ten-year mean by mid-July, Russian winter-wheat soil moisture anomalies in April–May, and Indian Kharif rainfall against the long-period average. By the time these signals are confirmed in official estimates, the price moves are mostly already in.",
        ],
      },
    ],
  },
  {
    slug: "leading-indicators-shipping-and-freight",
    title: "Freight rates lead inflation. Sometimes by months.",
    dek: "Container rates, supplier delivery times, and port congestion show up in CPI roughly six to nine months later — for goods inflation, in countries where imports matter.",
    label: "Leading Indicators",
    tag: "Inflation",
    column: "Leading Indicators",
    visualKind: "leading-indicators",
    prominence: "minor",
    publishedAt: "2026-05-02",
    readingTime: "4 min",
    sections: [
      {
        heading: "The 2021–2022 lesson",
        body: [
          "Container shipping rates on the trans-Pacific route quintupled between mid-2020 and late 2021. Supplier delivery times in the ISM Manufacturing PMI hit historic highs over the same period. US core goods CPI peaked roughly nine months later, in early 2022. The relationship was not subtle. It was just unfashionable to take seriously after a decade of nothing happening to global supply chains.",
          "Forecasters who incorporated freight indices into their inflation models in mid-2021 — most notably the New York Fed&rsquo;s Global Supply Chain Pressure Index — were systematically less wrong about the 2022 inflation peak. Forecasters who waited for it to show up in CPI were systematically late.",
        ],
      },
      {
        heading: "The signal is conditional",
        body: [
          "Freight pressure feeds inflation when imports are a large share of the consumption basket, when domestic competition is limited, when currency moves do not absorb the shock, and when retailers have pricing power. Strip away any of those and the pass-through weakens. In the US the elasticity is roughly 0.1–0.15 (a ten-percent freight rate spike adds about one to one-and-a-half percentage points to core goods inflation, with a six-to-nine-month lag). In countries with subsidised consumer goods or pegged currencies, it is lower and noisier.",
        ],
      },
      {
        heading: "What that means now",
        body: [
          "Container rates are currently mid-cycle and slowly rising. Supplier delivery times are normalising back to neutral. Neither is screaming. Both are worth watching, especially if Red Sea routing pressure or any new tariff regime kicks freight rates higher in the next quarter.",
        ],
      },
    ],
  },
  {
    slug: "forecaster-spotlight-public-institution-benchmarks",
    title: "Forecaster Spotlight: the IMF is the benchmark, not because it is best",
    dek: "Public institutions earn their position in the forecast record through coverage, cadence, and methodological transparency. None of them are uniformly accurate. All of them are useful baselines.",
    label: "Forecaster Spotlight",
    tag: "Institutions",
    column: "Forecaster Spotlight",
    visualKind: "forecaster-spotlight",
    prominence: "top",
    publishedAt: "2026-05-02",
    readingTime: "5 min",
    sections: [
      {
        heading: "Coverage is what makes them benchmarks",
        body: [
          "The IMF&rsquo;s World Economic Outlook covers roughly 190 economies, every six months, with twelve consistent macro variables and a published methodology. The OECD covers fewer countries with more depth and a faster cadence on the larger ones. The ECB covers the Euro Area in extreme detail. The World Bank covers low-income countries that nobody else covers carefully. None of them is uniformly the most accurate forecaster on every variable. All of them are essential in any forecast record because of what they cover.",
        ],
      },
      {
        heading: "Where each one is actually good",
        body: [
          "On long-horizon US, Euro Area, and Chinese GDP, all four major institutions cluster within roughly half a percentage point of each other and of the eventual outturn — the boring middle of consensus. On unemployment forecasts at the one-year horizon, the OECD has historically had the lowest mean absolute error in advanced economies. The ECB does the cleanest job of revising in real time when the data shifts. The IMF&rsquo;s value is breadth — there are countries where its forecast is the only public forecast.",
        ],
      },
      {
        heading: "What the spotlight actually shows",
        body: [
          "On the public profile we display coverage breadth, source vintages, indicator and country counts, and the variable signature — a Prism dial that summarises which indicators each institution is most active on. We deliberately do not display per-horizon error tables in public. Those are real, valuable, and live behind subscriber access where the comparison can be made carefully.",
        ],
      },
    ],
  },
  {
    slug: "first-public-forecast-record",
    title: "The first public forecast record is built. Here is what is in it.",
    dek: "Roughly 17,000 forecasts. 11,000 actuals. Five major institutions across two decades. Every cell traceable to the source document it came from.",
    label: "Farfield Blog",
    tag: "Forecast record",
    column: "Farfield Blog",
    visualKind: "source-record",
    prominence: "minor",
    publishedAt: "2026-05-02",
    readingTime: "4 min",
    sections: [
      {
        heading: "What is live",
        body: [
          "The Farfield public record currently contains every World Economic Outlook vintage from April 2007 to April 2026 (twelve releases), every OECD Economic Outlook from EO-114 to EO-118, the full ECB Macroeconomic Projection Database (thirty-three vintages), the most recent World Bank Global Economic Prospects, and IMF commodity price forecasts from the Oct-2025 WEO. Roughly 17,000 individual forecasts in total, joined to roughly 11,000 actuals, with 5,906 forecast–actual pairs scored against first-release WEO actuals.",
        ],
      },
      {
        heading: "What every row knows about itself",
        body: [
          "Every forecast row carries: the forecaster ID, the variable ID, the target period, the publication-date vintage, the source document hash, and the ingestion run that imported it. Every actual row carries the same provenance plus the release number — initial release, first revision, second revision, latest. Every score row links one forecast ID to one actual ID and the methodology version it was computed under.",
          "This level of traceability is why the public site can show coverage and aggregates without leaking forecast values: every aggregate is reproducible from the underlying rows, and every underlying row knows where it came from.",
        ],
      },
      {
        heading: "What we are not doing yet",
        body: [
          "We are not yet ingesting Philly Fed SPF, Fed SEP, Bank of England MPR, or Bank of Japan Outlook. They are next in the wave plan. We are also not yet pulling actuals from national statistical authorities directly — for the cross-country macro panel we use WEO-carried national-authority data as a deliberate, documented choice. The methodology page explains why.",
        ],
      },
    ],
  },
  {
    slug: "why-gdp-surprises-are-not-all-equal",
    title: "Not every GDP surprise means the same thing",
    dek: "The same one-percentage-point miss can be a forecaster failure, a revision artifact, or a fair call on a moving target. The horizon and the vintage decide which.",
    label: "Variable explainer",
    tag: "GDP growth",
    column: "Farfield Blog",
    visualKind: "gdp-revisions",
    prominence: "minor",
    publishedAt: "2026-05-02",
    readingTime: "5 min",
    sections: [
      {
        heading: "Three different misses, one number",
        body: [
          "Imagine three forecasters all forecasting US 2025 real GDP growth and all landing on 2.0%. The first publishes their forecast in January 2024 — roughly 24 months ahead. The second publishes in January 2025 — about 12 months ahead. The third publishes in October 2025 — basically a nowcast. The eventual first-release print is 2.5%. Each forecaster &lsquo;missed by 0.5pp.&rsquo; None of those misses means the same thing.",
          "The 24-month forecaster missed by an amount well within the long-run noise of GDP forecasting at that horizon. The 12-month forecaster missed by roughly a standard deviation of error at their horizon — uncomfortable but not embarrassing. The nowcaster missed by something that looks more like a methodology problem than a forecasting problem.",
        ],
      },
      {
        heading: "Why we store horizon explicitly",
        body: [
          "Every forecast row in Farfield has a `forecast_made_at` timestamp distinct from the ingestion timestamp. For institutional forecasts that means the publication date of the vintage, not when our scraper ran. The horizon used in scoring is computed from `target_start_date - forecast_made_at` in months, so a 24-month forecast and a 1-month forecast are never compared directly without that context.",
          "On the subscriber side, this means the accuracy table is sliced by horizon. On the public side, this means a forecaster who makes early bold calls is not unfairly penalised against one who waits for the data and nowcasts.",
        ],
      },
      {
        heading: "Why we store actual vintages too",
        body: [
          "GDP gets revised. Every quarterly print in advanced economies gets at least three revisions before the annual benchmark, and benchmark revisions can shift the level of GDP measurably. A score against the first release captures what was knowable at the time. A score against the latest release captures what we now believe actually happened. Both are useful. They answer different questions, so we store both and let the user — eventually — pick which view they want to see.",
        ],
      },
    ],
  },
  {
    slug: "actuals-before-rankings",
    title: "Why we are publishing actuals before we publish rankings",
    dek: "Most forecast leaderboards make at least three avoidable mistakes. The fix is to get the actuals layer right first, then publish ranking tables that survive scrutiny.",
    label: "Farfield Blog",
    tag: "Scoring",
    column: "Farfield Blog",
    visualKind: "scoring",
    prominence: "minor",
    publishedAt: "2026-05-02",
    readingTime: "3 min",
    sections: [
      {
        heading: "The three avoidable mistakes",
        body: [
          "First: scoring against the latest available actual without saying so. This rewards forecasters who happen to land near the latest revised history and penalises ones who landed near the first release. Both choices are defensible, but only one of them is being made if you do not say which.",
          "Second: aggregating across horizons. A forecaster who publishes monthly nowcasts will dominate any leaderboard that mixes horizons, because nowcast errors are simply smaller. The fair comparison is at a fixed horizon — usually 12 months ahead, often 24.",
          "Third: aggregating across coverage. A forecaster covering only OECD countries will look much more accurate on a global average than one covering frontier economies. The leaderboard needs to be sliced by country group as well as horizon.",
        ],
      },
      {
        heading: "What we are doing instead",
        body: [
          "Farfield&rsquo;s scoring engine stores forecast–actual pairs with explicit horizon, methodology version, signed error, and the actual ID it was scored against. The first public ranking table will be sliced by horizon and country group, will use first-release actuals by default with latest-release shown as a secondary view, and will only include forecasters with a minimum sample size to keep noise out.",
        ],
      },
      {
        heading: "Why this takes time",
        body: [
          "We could publish a leaderboard tomorrow. It would attract attention and we would have to defend the methodology in public for the next two years. We would rather publish it once the actuals layer, the horizon handling, and the methodology versioning are all stable. That is what most of the last six months has been about.",
        ],
      },
    ],
  },
];

export const methodologyNotes: PublicContentItem[] = [
  {
    slug: "weo-national-authority-actuals",
    title: "How Farfield treats WEO actuals",
    dek: "WEO is the carrier dataset for cross-country macro actuals — a deliberate methodological choice, not a fallback.",
    label: "Methodology",
    tag: "Actuals",
    publishedAt: "2026-05-02",
    readingTime: "6 min",
    sections: [
      {
        heading: "The default rule",
        body: [
          "For the core cross-country macro panel — GDP growth, CPI inflation, unemployment, current account balance, government balance — Farfield uses WEO-carried observations identified by the IMF as historical or actual data, and which can be mapped to a national-authority or equivalent source status. The WEO is the carrier of these values, not the economic authority itself: the IMF country desks compile from the same national statistics offices Farfield would otherwise have to ingest one by one.",
          "Why this choice rather than direct national authority ingestion? Three reasons. Coverage: the WEO covers roughly 190 economies on a consistent six-month cadence, including most countries where Farfield could not feasibly maintain a separate ingestion pipeline. Consistency: WEO methodology notes document fiscal-year handling, base-year rebases, and exchange-rate conventions in one place, where every national source would need its own treatment. Auditability: a single source-document hash per vintage replaces dozens of bespoke parsers per quarter.",
          "World Bank rows remain in the database as cross-references and explicit fallback exceptions where WEO does not provide an unambiguous match (currently 45 such rows). They are not the default scoring baseline.",
        ],
      },
      {
        heading: "Fiscal-year handling",
        body: [
          "Some economies — India, Pakistan, Bangladesh among major ones — report on fiscal-year calendars that do not align with calendar years. Farfield maps fiscal years using explicit WEO methodology metadata where it is published, including the convention that FY(t-1/t) maps to CY(t) for South Asian fiscal years. We do not infer fiscal-year mapping from the table layout alone, because doing so misclassifies revisions and creates false vintage shifts that look like forecaster moves when they are actually accounting conventions.",
        ],
      },
      {
        heading: "Score links",
        body: [
          "Every score row points to: the exact forecast row (by ID), the exact actual row used as the baseline (by ID, including release number), and the scoring methodology version (currently v1.0). When the actual is later revised, the original score row is not overwritten. A new score row can be computed against the revised actual under a new methodology version, and both records remain queryable.",
          "This is what lets Farfield publish first-release scores and latest-release scores side by side without either one silently overwriting the other.",
        ],
      },
    ],
  },
  {
    slug: "consensus-as-of-snapshots",
    title: "Consensus is an as-of snapshot, not a moving average",
    dek: "Consensus values and dispersion are computed at specific points in time, recorded with the methodology version that produced them, and never overwritten when new vintages arrive.",
    label: "Methodology",
    tag: "Consensus",
    publishedAt: "2026-05-02",
    readingTime: "4 min",
    sections: [
      {
        heading: "The question consensus answers",
        body: [
          "&lsquo;What is the consensus 2026 GDP growth forecast for South Africa?&rsquo; is not a complete question. The complete question is: &lsquo;Across the contributors who had a published 2026 South Africa GDP growth forecast as of date X, what was the median, the mean, the dispersion, and the included count?&rsquo;",
          "Most consensus products silently re-answer this question every time a new contributor forecast arrives, overwriting the previous record. That is fine for the purpose of telling you what consensus is right now. It is useless for any analytical question about how consensus moved over time, when it caught a turning point, or how dispersion behaved before a major release.",
        ],
      },
      {
        heading: "What gets stored",
        body: [
          "Each consensus row carries: variable ID, target period, target start date, as-of date, consensus type (basic mean or weighted), methodology version, the consensus value, the included forecast count, and the high–low range. New consensus computations insert new snapshot rows. The latest snapshot is convenient to query but never replaces history.",
          "On the data layer, this means a subscriber can ask: &lsquo;What was the consensus path for US 2026 GDP between April 2024 and now, broken into monthly snapshots?&rsquo; — and get a real time series, not an extrapolation.",
        ],
      },
      {
        heading: "What the public sees",
        body: [
          "Public pages can state that consensus exists for a variable and show coverage counts. The consensus value itself, the time series, and the dispersion are subscriber data unless the underlying source is explicitly safe to display in public — currently a narrow set of cases where the institutional contributor has already published the same number openly.",
        ],
      },
    ],
  },
  {
    slug: "public-leakage-boundary",
    title: "What public users see, what subscribers see, and how the line is enforced",
    dek: "Server-side access policy, automated leakage tests against HTML and JSON responses, and an explicit list of fields the public surface may carry.",
    label: "Methodology",
    tag: "Access",
    publishedAt: "2026-05-02",
    readingTime: "4 min",
    sections: [
      {
        heading: "What public pages may carry",
        body: [
          "Actuals values and full actuals history; source labels; coverage counts (forecasters covering a variable, target periods covered); institution and forecaster profiles with breadth signals; methodology notes; vintage labels (the names of source publications without the values they contain); and explicit locked-module previews that describe what subscribers can access without embedding the values themselves.",
        ],
      },
      {
        heading: "What public pages must not carry",
        body: [
          "Forecast values from any contributor; consensus values (mean, median, range, dispersion); private or commercial forecaster series; vintage history values (the actual numbers that changed between vintages, as opposed to the labels); reconstructive chart props or hidden hydration payloads carrying any of the above; and detailed per-horizon error tables that could be reverse-engineered into accuracy ranks.",
        ],
      },
      {
        heading: "How the boundary is enforced",
        body: [
          "Every API route and server component touching forecast data flows through a shared access policy layer in `src/lib/access/`. Public requests return shaped data with the gated fields stripped before serialization, not after. The leakage test suite then makes real HTTP requests against a built production server and inspects HTML, JSON, chart props, hydration data, and metadata for sampled forecast values, MAE/bias terms, and known forecaster forecast values from the database. If any public route returns one of these, the test fails and the build does not ship.",
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
