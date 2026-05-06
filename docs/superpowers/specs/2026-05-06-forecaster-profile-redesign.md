<!-- Design spec for the next Farfield forecaster profile redesign. -->

# Forecaster Profile Redesign

Date: 2026-05-06
Status: Draft for user review

## Context

Farfield needs profile pages that can attract both elite independent researchers and major institutions. The current profile page is useful as a public coverage and trust signal, but it does not yet give forecasters a strong enough place to showcase their research, products, and professional identity.

The redesign keeps Farfield's core promise intact: users should be able to compare individuals, banks, research houses, and public institutions on the same standard. Forecasters can shape their presentation, but Farfield controls the evidence layer.

## Product Principles

- One universal profile system for individuals, institutions, and research houses.
- No profile archetypes. Individuals should compete with institutions on the same page structure and evidence standard.
- Farfield-owned trust signals must be visibly separate from forecaster-owned copy.
- Track record, score, rank, sample size, and customer recommendations are controlled by Farfield.
- Forecasters can personalise the middle of the profile through approved widgets.
- Customer proof should be serious and text-led, with no star ratings.
- Public/free pages must remain non-leaky and must not expose forecast values, paid consensus values, private series, reconstructive chart data, or detailed subscriber-only score tables.

## Recommended Approach

Use a universal modular profile with a fixed trust spine.

The page has three fixed anchors:

1. Top hero with a compact side score rail.
2. Flexible middle modules chosen from approved widgets.
3. Fixed bottom section for verified client recommendations.

This gives forecasters enough ownership to make the page feel like a professional showcase, while keeping comparison and credibility consistent across the marketplace.

## Page Structure

### Hero

The hero is split into a main profile area and a compact Farfield score rail.

Forecaster-controlled hero content:

- Name
- Short headline or positioning statement
- Bio summary
- Specialties or focus tags
- Featured widget, such as latest analysis, a featured forecast view, a product, or a methodology note

Farfield-controlled side rail:

- Forecast score
- Peer rank or status
- Scored sample size
- Consensus performance where safe to show
- Coverage breadth
- Scoring status
- Methodology version

The side rail should feel like an independent scorecard, not an advertisement. It should not use customer star ratings.

### Flexible Middle Modules

The middle of the page is configured by an ordered list of approved widget keys. Forecasters can choose and reorder these widgets, but cannot add arbitrary HTML or change Farfield-owned data.

Recommended widgets:

- Featured forecast
- Track record
- Coverage by indicator, geography, and vintage
- Latest analysis
- Products
- Datasets
- Calls or consulting
- Specialties
- Methodology note
- Media or credentials
- Team or author bio

Farfield may require certain widgets when data exists, especially track record and coverage. Widgets should use standard templates so profiles remain comparable.

### Verified Recommendations

Verified client recommendations appear near the bottom of every profile in the same location.

Rules:

- No stars.
- No numeric customer rating.
- Text-only recommendations.
- Only customers who bought through Farfield can leave recommendations.
- Recommendations are tied to transaction context, such as subscriber, report buyer, brief client, or call client.
- Farfield moderates abuse, spam, conflicts of interest, and defamatory claims.
- Forecasters can respond publicly, but cannot edit, hide, pin, or reorder recommendations.
- Empty state: "No verified client recommendations yet."

Display pattern:

- Manual carousel.
- One recommendation visible at a time.
- Previous and next arrows.
- No autoplay.
- Visible count, such as "47 verified recommendations."
- Randomised order per page view or session so forecasters cannot implicitly privilege a quote.

## Data Model Direction

Near-term profile fields:

- `headline`
- `short_bio`
- `specialties`
- `external_links`
- `profile_layout_config`
- `featured_widget_key`
- `featured_widget_config`

The layout config should store approved widget keys and settings, not arbitrary markup.

Future recommendation fields should connect to marketplace transactions:

- `forecaster_id`
- `customer_user_id`
- `transaction_id`
- `transaction_type`
- `body`
- `status`
- `moderation_reason`
- `forecaster_response`
- `display_seed` or equivalent support for stable randomisation per session/page view
- timestamps for creation, moderation, publication, and response

The recommendation table should be added only when Farfield has marketplace transactions that can verify customer status.

## Access And Data Safety

Public profile pages may show:

- Profile copy
- Public articles and public products
- Coverage counts
- Source/vintage labels
- Non-reconstructive track record summaries
- Scoring status
- Methodology version
- Verified recommendation text

Public profile pages must not show:

- Private forecast values
- Paid consensus values
- Subscriber-only vintage history values
- Private/commercial forecast series
- Reconstructive chart payloads
- Full detailed per-forecaster score tables
- Hidden JSON or hydration data containing locked values

All profile data fetching should continue through Drizzle query helpers and access-safe shaping functions.

## Components

Likely component boundaries:

- `ForecasterProfileHero`
- `ForecasterScoreRail`
- `ForecasterWidgetRenderer`
- `TrackRecordWidget`
- `CoverageWidget`
- `LatestAnalysisWidget`
- `ProductsWidget`
- `SpecialtiesWidget`
- `MethodologyNoteWidget`
- `VerifiedRecommendationsCarousel`

Server components should be the default. The recommendations carousel can be a small client component because it needs arrow interaction and randomised ordering behavior. The client component should receive only public recommendation text and metadata.

## Error Handling And Empty States

- Missing forecaster: return the existing `notFound()` behavior.
- No tracked forecasts: keep the profile available, but show "Building track record" and omit score/rank values.
- No scored forecasts: show coverage and cadence, not accuracy claims.
- No configured widgets: render a conservative default order.
- Unknown widget key: skip it and optionally record an admin-visible quality flag or structured log.
- No recommendations: show the fixed empty state at the bottom of the page.
- Moderated or removed recommendation: never render removed text publicly.

## Implementation Sequence

1. Write profile redesign spec and review with the user.
2. Create an implementation plan after approval.
3. Add profile data fields and layout config if needed.
4. Build read-only public profile redesign using seeded/default widget config.
5. Add the side score rail from existing public-safe profile metrics.
6. Add widget renderer and initial widgets.
7. Add recommendation carousel only as an empty-state section until transaction-backed recommendations exist.
8. Extend leakage tests for redesigned profile HTML, JSON, chart props, hydration data, and API route responses.
9. Add Studio editing later, after the public profile model is stable.

## Testing

Required checks after implementation:

- `npx tsc --noEmit`
- `npm run build`
- `node --env-file=.env.local node_modules/tsx/dist/cli.mjs scripts/leakage-tests.ts`

Profile-specific tests should verify:

- Public profile HTML does not include locked forecast values.
- Public profile API responses do not include locked score tables or reconstructive data.
- Unknown widget keys do not crash the page.
- Empty profiles render sensible defaults.
- Recommendations carousel receives only published, moderated, verified-customer recommendations.
- Removed or pending recommendations never render.

## Open Decisions

- Exact score/rank label language.
- Which score is public in Phase 1 versus subscriber-only.
- Whether randomised recommendation order should be per page view or stable per visitor session.
- Which widgets are required when sufficient data exists.
- When Studio profile customisation should enter the build sequence.
