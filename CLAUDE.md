# Forethought

Economic forecasting marketplace with transparent performance tracking.

## Tech stack
- Next.js 15 (App Router), React 19, TypeScript 5
- PostgreSQL via Drizzle ORM
- Auth.js (NextAuth v5)
- Stripe (Connect for marketplace payments)
- Cloudflare R2 for file storage
- Recharts for data visualisation
- Meilisearch for search

## Coding standards
- All DB queries through Drizzle (no raw SQL except scoring engine)
- All API inputs validated with Zod
- All financial amounts as integers (cents)
- All timestamps UTC
- All forecast values DECIMAL, not FLOAT
- Server components by default; client components only for interactivity
- Structured JSON error responses with correct HTTP status codes

## Current phase
Phase 1: Forecast Observatory — see docs/BUILD_PLAN.md for full detail.

## Key files
- docs/BUILD_PLAN.md — full platform specification, database schema, 
  build sequence, and reasoning. READ THIS before starting any major 
  new feature.
- src/lib/db/ — Drizzle schema and migrations
- src/lib/scoring/ — forecast scoring engine
- src/lib/ingestion/ — data import scripts for institutional forecasts

## Words to avoid in any user-facing copy
landscape, navigate, robust, holistic, stakeholder

## Development protocol

### Git discipline
- Initialise a Git repo before any code is written
- Commit after every meaningful change with a descriptive message
- NEVER make large changes across many files without committing 
  the working state first
- If something breaks and the fix isn't obvious within a few minutes, 
  revert to the last working commit rather than piling fixes on top 
  of fixes

### Progress tracking
- Maintain docs/PROGRESS.md — update it at the end of every work session
- Format:

  ## Session [date]
  ### Completed
  - What was built or changed
  ### Current state
  - What works, what's deployed, what's testable
  ### Known issues
  - Anything broken or incomplete
  ### Next steps
  - What to do in the next session (ordered by priority)

### Build approach
- Work in small increments. Each increment should be testable on its own.
- After building something, verify it works before moving on.
- When building a new feature, state what you're about to do and why 
  BEFORE writing code. This gives me a chance to course-correct.
- If you encounter a choice with significant trade-offs, explain the 
  options and let me decide rather than choosing silently.
- If something isn't working after two attempts to fix it, stop and 
  explain the problem clearly rather than continuing to iterate.

### Code documentation
- Add a brief comment at the top of every new file explaining its purpose
- For complex logic (especially in the scoring engine), add inline 
  comments explaining the reasoning