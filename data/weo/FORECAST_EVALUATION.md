# WEO Forecast Evaluation: Data Model & Methodology

## Background

The `weo/` directory contains IMF World Economic Outlook (WEO) "By Countries" datasets, one file per edition (vintage). The IMF publishes twice yearly — April and October — so we have files like:

```
WEOApr2007all.txt   ← April 2007 vintage
WEOOct2007all.txt   ← October 2007 vintage
WEOApr2008all.txt
WEOOct2008all.txt
...
WEOOct2025all.txt
```

Each file is **tab-delimited** and contains one row per (country, indicator) combination. The columns include country metadata plus one column per year (e.g. `1980`, `1981`, ..., `2012` for the 2007 edition).

---

## Key Concept: Forecasts vs. Actuals Within a Vintage

Within any given vintage, the year columns contain a mix of:

- **Historical actuals** — years already past when the edition was published
- **Current-year estimate** — the year of publication (e.g. 2007 in the Apr 2007 file)
- **Forecasts** — typically 5 years forward from the publication year

For example, the **April 2007 vintage** contains:
- Actuals: 1980–2006
- Current estimate: 2007
- Forecasts: 2008, 2009, 2010, 2011, 2012

The IMF does **not** flag which cells are actuals vs. forecasts within the file itself — this is implied by the publication date. Any year ≥ publication year is a forecast or current estimate.

---

## Evaluation Methodology

To score a forecast, we compare:

> **Forecast value**: the value for year `T` as published in an earlier vintage `V < T`  
> **Outturn ("actual") value**: the value for year `T` as published in a later vintage `V' > T`

### Why use a later vintage as the "actual"?

Because by the time vintage `V'` is published (say, 2 years after year `T`), the IMF has incorporated final national accounts data. We treat this as our best available estimate of what actually happened. The later the vintage used for the outturn, the more reliable — but we cap at ~2 years after `T` to keep comparisons tractable.

### Recommended outturn vintage

Use the **October edition two years after year T** as the outturn. For example:
- Forecast target year: 2009
- Outturn vintage: `WEOOct2011all.txt`

This gives the statistical agency roughly 2 years to revise and finalize data.

---

## Worked Example

**Setup**: Evaluate the IMF's April 2007 forecast for **2009 GDP growth in Germany**.

| Step | Vintage | Year column | Value |
|------|---------|-------------|-------|
| Forecast | `WEOApr2007all.txt` | `2009` | 1.8% |
| Outturn | `WEOOct2011all.txt` | `2009` | –5.6% |
| Error | — | — | –7.4 pp |

The April 2007 vintage forecasted 1.8% growth for Germany in 2009; the realized outcome (as measured in late 2011) was –5.6%. Forecast error = outturn − forecast = –7.4 percentage points.

---

## Data Structure for Forecast Evaluation

To build the evaluation dataset, construct a table with one row per **forecast observation**:

```
vintage_date     : publication date of the forecasting vintage (e.g. "2007-04")
target_year      : the year being forecasted (e.g. 2009)
horizon          : target_year - vintage_year (e.g. 2 for a 2-year-ahead forecast)
country_code     : ISO or WEO country code
indicator        : WEO subject code (e.g. "NGDP_RPCH" for real GDP growth)
forecast_value   : value from the forecasting vintage for target_year
outturn_value    : value from the outturn vintage for target_year
outturn_vintage  : which vintage is used as the "actual" (e.g. "2011-10")
forecast_error   : outturn_value - forecast_value
abs_error        : |forecast_error|
```

### Vintage coverage logic

For each forecasting vintage `V` (e.g. April 2007):
- **Forecasting years**: vintage_year through vintage_year + 5
- **Outturn vintages needed**: October of (target_year + 2) for each target year
- **Skip** if outturn vintage file doesn't exist yet (future targets)

---

## Indicator Scope

The WEO files contain dozens of indicators. The most important for forecast evaluation are:

| WEO Code | Description |
|----------|-------------|
| `NGDP_RPCH` | Real GDP growth (% change) |
| `PCPIPCH` | CPI inflation (% change) |
| `LUR` | Unemployment rate (%) |
| `BCA_NGDPD` | Current account (% of GDP) |
| `GGXCNL_NGDP` | General government net lending (% of GDP) |

Start with `NGDP_RPCH` as the primary evaluation metric — it is the IMF's headline forecast variable and the most studied in the academic literature.

---

## What to Build

1. **Ingest**: Parse all `WEO*.txt` files in this directory. Each row = (country, indicator, year_values). Tag each row with its vintage (parsed from filename).

2. **Join**: For each (vintage, country, indicator, target_year) tuple where an outturn vintage exists, produce a forecast observation row as described above.

3. **Analyse / Display**: Show users:
   - Forecast errors by horizon (1-year-ahead vs. 5-year-ahead)
   - Forecast errors by era (pre-2008 crisis vs. post; COVID period)
   - Forecast errors by country or region
   - Distribution of errors (bias: are forecasts systematically optimistic?)
   - Improvement over time: does accuracy improve in later vintages closer to the target year?

4. **Key insight to surface**: IMF forecasts are well-documented to have an **optimism bias** — especially at longer horizons and during downturns. The data should show this clearly.

---

## File Parsing Notes

There are **two distinct file formats** in this directory, requiring two separate parser branches:

### Format A — Old site tab-delimited (2007–April 2025)
Files: `WEO{Apr|Oct}{YYYY}all.txt` (downloaded from imf.org/publications/weo/weo-database/)

These files have a `.xls` extension at source but are plain tab-delimited text, saved here as `.txt`. Key columns:

| Column | Description |
|--------|-------------|
| `WEO Country Code` | IMF numeric country code |
| `ISO` | ISO 2-letter country code |
| `WEO Subject Code` | Indicator code (e.g. `NGDP_RPCH`) |
| `Country` | Country name |
| `Subject Descriptor` | Indicator label |
| `Subject Notes` | Notes on methodology |
| `Units` | Units of measurement |
| `Scale` | Scale (e.g. Billions) |
| `Country/Series-specific Notes` | Country-level notes |
| `1980` … `2030` | Annual values — mix of actuals and forecasts |
| `Estimates Start After` | The last year of actuals (the cutoff year) |

The `Estimates Start After` column is critical: it marks exactly where actuals end and forecasts begin within each vintage. Use this column — not the publication year — to split actuals from forecasts.

Missing/unavailable data appears as `n/a` or empty — treat as null. Some numeric values include commas as thousand-separators — strip before parsing.

### Format B — New Data Portal Excel (October 2025 onwards)
Files: `WEOOct2025all.xlsx`, etc. (downloaded from data.imf.org)

A proper `.xlsx` workbook with three sheets:
- **Countries** — country-level data (equivalent to Format A "By Countries")
- **Country Groups** — aggregated regional/income group data
- **Commodity Prices** — commodity price series

Read the **Countries** sheet. Its column structure differs significantly from Format A — it uses `WEO Country Code`, `ISO`, `WEO Subject Code`, `Country`, `Subject Descriptor`, `Units`, `Scale`, plus year columns, but with additional metadata columns. Check the actual sheet headers when implementing.

> **Note**: An `Estimates Start After` equivalent column may exist — check the sheet structure and use it to split actuals from forecasts, as with Format A.

### Vintage inference rule (both formats)

When `Estimates Start After` is available, use it directly. Otherwise, derive the vintage publication year from the filename (e.g. `WEOApr2016all.txt` → vintage year 2016, month April) and treat any year ≥ vintage year as a forecast.
