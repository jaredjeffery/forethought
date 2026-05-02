// Admin-only data QA screen for ingestion, source mapping, and score review.

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getDataQaSnapshot } from "@/lib/admin/data-qa";
import { eq } from "drizzle-orm";
import { Card } from "@/components/ui/Card";
import { SectionLabel } from "@/components/ui/SectionLabel";

export const dynamic = "force-dynamic";

type DataQaSnapshot = Awaited<ReturnType<typeof getDataQaSnapshot>>;

async function requireAdmin() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    redirect("/signin?callbackUrl=/admin/data-qa");
  }

  const [user] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (user?.role !== "ADMIN") {
    notFound();
  }
}

function formatDate(value: Date | string | null) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("en-ZA", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(date);
}

function formatDay(value: Date | string | null) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("en-ZA", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(date);
}

function metricLabel(value: number) {
  return value.toLocaleString("en-ZA");
}

function StatusBadge({ status }: { status: string }) {
  const color =
    status === "success"
      ? "bg-signal-green/10 text-signal-green"
      : status === "failed"
        ? "bg-signal-red/10 text-signal-red"
        : status === "running"
          ? "bg-accent/10 text-accent"
          : "bg-amber-100 text-amber-700";

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${color}`}>
      {status}
    </span>
  );
}

function JsonPreview({ value }: { value: unknown }) {
  if (!value) return <span className="text-muted">-</span>;
  const text = JSON.stringify(value);
  return (
    <code className="block max-w-[360px] truncate rounded bg-bg px-2 py-1 text-xs text-muted">
      {text}
    </code>
  );
}

function SummaryCards({ snapshot }: { snapshot: DataQaSnapshot }) {
  const cards = [
    {
      label: "Attention runs",
      value: snapshot.summaries.attentionRunCount,
      tone: snapshot.summaries.attentionRunCount > 0 ? "text-signal-red" : "text-signal-green",
    },
    {
      label: "Running imports",
      value: snapshot.summaries.runningRunCount,
      tone: snapshot.summaries.runningRunCount > 0 ? "text-accent" : "text-muted",
    },
    {
      label: "Open quality flags",
      value: snapshot.summaries.openFlagCount,
      tone: snapshot.summaries.openFlagCount > 0 ? "text-signal-red" : "text-signal-green",
    },
    {
      label: "Score ref issues",
      value: snapshot.summaries.scoreIssueCount,
      tone: snapshot.summaries.scoreIssueCount > 0 ? "text-signal-red" : "text-signal-green",
    },
    {
      label: "Docs missing hash",
      value: snapshot.summaries.sourceDocumentsMissingHashCount,
      tone: snapshot.summaries.sourceDocumentsMissingHashCount > 0 ? "text-amber-700" : "text-signal-green",
    },
    {
      label: "Docs without rows",
      value: snapshot.summaries.sourceDocumentsWithoutRowsCount,
      tone: snapshot.summaries.sourceDocumentsWithoutRowsCount > 0 ? "text-amber-700" : "text-signal-green",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => (
        <Card key={card.label} padding="sm">
          <p className="text-xs font-bold uppercase tracking-widest text-muted">{card.label}</p>
          <p className={`mt-3 text-3xl font-semibold tabular-nums ${card.tone}`}>
            {metricLabel(card.value)}
          </p>
        </Card>
      ))}
    </div>
  );
}

function SourceDocumentsTable({ rows }: { rows: DataQaSnapshot["sourceDocuments"] }) {
  return (
    <Card padding="none">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="border-b border-border bg-bg">
            <tr className="text-xs font-bold uppercase text-muted">
              <th className="px-5 py-3 text-left">Source</th>
              <th className="px-5 py-3 text-left">Vintage</th>
              <th className="px-5 py-3 text-left">Published</th>
              <th className="px-5 py-3 text-right">Forecasts</th>
              <th className="px-5 py-3 text-right">Actuals</th>
              <th className="px-5 py-3 text-left">Hash</th>
              <th className="px-5 py-3 text-left">Ingested</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="px-5 py-3 text-sm font-semibold text-ink">
                  {row.sourceUrl ? (
                    <Link href={row.sourceUrl} className="hover:text-accent">
                      {row.sourceName}
                    </Link>
                  ) : (
                    row.sourceName
                  )}
                </td>
                <td className="px-5 py-3 text-sm text-muted">{row.vintageLabel}</td>
                <td className="px-5 py-3 text-sm text-muted">{formatDay(row.publicationDate)}</td>
                <td className="px-5 py-3 text-right font-mono text-sm tabular-nums">
                  {metricLabel(Number(row.forecastCount))}
                </td>
                <td className="px-5 py-3 text-right font-mono text-sm tabular-nums">
                  {metricLabel(Number(row.actualCount))}
                </td>
                <td className="px-5 py-3 font-mono text-xs text-muted">
                  {row.fileHash ? row.fileHash.slice(0, 12) : "missing"}
                </td>
                <td className="px-5 py-3 text-sm text-muted">{formatDate(row.ingestedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function IngestionRunsTable({ rows }: { rows: DataQaSnapshot["ingestionRuns"] }) {
  return (
    <Card padding="none">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="border-b border-border bg-bg">
            <tr className="text-xs font-bold uppercase text-muted">
              <th className="px-5 py-3 text-left">Source</th>
              <th className="px-5 py-3 text-left">Vintage</th>
              <th className="px-5 py-3 text-left">Status</th>
              <th className="px-5 py-3 text-right">Created</th>
              <th className="px-5 py-3 text-right">Updated</th>
              <th className="px-5 py-3 text-right">Skipped</th>
              <th className="px-5 py-3 text-left">Started</th>
              <th className="px-5 py-3 text-left">Errors</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="px-5 py-3 text-sm font-semibold text-ink">{row.sourceName}</td>
                <td className="px-5 py-3 text-sm text-muted">{row.vintageLabel ?? "-"}</td>
                <td className="px-5 py-3"><StatusBadge status={row.status} /></td>
                <td className="px-5 py-3 text-right font-mono text-sm tabular-nums">
                  {metricLabel(row.recordsCreated)}
                </td>
                <td className="px-5 py-3 text-right font-mono text-sm tabular-nums">
                  {metricLabel(row.recordsUpdated)}
                </td>
                <td className="px-5 py-3 text-right font-mono text-sm tabular-nums">
                  {metricLabel(row.recordsSkipped)}
                </td>
                <td className="px-5 py-3 text-sm text-muted">{formatDate(row.startedAt)}</td>
                <td className="px-5 py-3"><JsonPreview value={row.errors} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function MappingsTable({ rows }: { rows: DataQaSnapshot["variableMappings"] }) {
  return (
    <Card padding="none">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="border-b border-border bg-bg">
            <tr className="text-xs font-bold uppercase text-muted">
              <th className="px-5 py-3 text-left">Source</th>
              <th className="px-5 py-3 text-left">Code</th>
              <th className="px-5 py-3 text-left">Source name</th>
              <th className="px-5 py-3 text-left">Farfield variable</th>
              <th className="px-5 py-3 text-left">Transform</th>
              <th className="px-5 py-3 text-left">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="px-5 py-3 text-sm font-semibold text-ink">{row.sourceName}</td>
                <td className="px-5 py-3 font-mono text-sm text-muted">{row.sourceVariableCode}</td>
                <td className="px-5 py-3 text-sm text-muted">{row.sourceVariableName ?? "-"}</td>
                <td className="px-5 py-3 text-sm text-ink">
                  {row.variableName} / {row.countryCode} / {row.unit}
                </td>
                <td className="px-5 py-3 text-sm text-muted">{row.unitTransform ?? "-"}</td>
                <td className="px-5 py-3 text-sm text-muted">{formatDate(row.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function ScoreReviewTable({ rows }: { rows: DataQaSnapshot["scoreReviewRows"] }) {
  return (
    <Card padding="none">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="border-b border-border bg-bg">
            <tr className="text-xs font-bold uppercase text-muted">
              <th className="px-5 py-3 text-left">Forecaster</th>
              <th className="px-5 py-3 text-left">Variable</th>
              <th className="px-5 py-3 text-left">Target</th>
              <th className="px-5 py-3 text-left">Vintage</th>
              <th className="px-5 py-3 text-right">Abs error</th>
              <th className="px-5 py-3 text-right">Bias</th>
              <th className="px-5 py-3 text-left">Actual</th>
              <th className="px-5 py-3 text-left">Method</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="px-5 py-3 text-sm font-semibold text-ink">{row.forecasterName}</td>
                <td className="px-5 py-3 text-sm text-muted">
                  {row.variableName} / {row.countryCode}
                </td>
                <td className="px-5 py-3 text-sm text-muted">{row.targetPeriod}</td>
                <td className="px-5 py-3 text-sm text-muted">{row.vintage ?? "-"}</td>
                <td className="px-5 py-3 text-right font-mono text-sm tabular-nums">
                  {row.absoluteError ?? "-"}
                </td>
                <td className="px-5 py-3 text-right font-mono text-sm tabular-nums">
                  {row.signedError ?? "-"}
                </td>
                <td className="px-5 py-3 text-sm text-muted">{row.actualSource ?? "missing"}</td>
                <td className="px-5 py-3 text-sm text-muted">
                  {row.methodologyVersion ?? "missing"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function FlagsTable({ rows }: { rows: DataQaSnapshot["dataQualityFlags"] }) {
  return (
    <Card padding="none">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="border-b border-border bg-bg">
            <tr className="text-xs font-bold uppercase text-muted">
              <th className="px-5 py-3 text-left">Severity</th>
              <th className="px-5 py-3 text-left">Status</th>
              <th className="px-5 py-3 text-left">Entity</th>
              <th className="px-5 py-3 text-left">Source</th>
              <th className="px-5 py-3 text-left">Message</th>
              <th className="px-5 py-3 text-left">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.length === 0 ? (
              <tr>
                <td className="px-5 py-6 text-sm text-muted" colSpan={6}>
                  No data quality flags recorded yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-5 py-3 text-sm font-semibold text-ink">{row.severity}</td>
                  <td className="px-5 py-3"><StatusBadge status={row.status} /></td>
                  <td className="px-5 py-3 text-sm text-muted">{row.entityType}</td>
                  <td className="px-5 py-3 text-sm text-muted">
                    {row.sourceName ? `${row.sourceName} / ${row.vintageLabel}` : "-"}
                  </td>
                  <td className="px-5 py-3 text-sm text-ink">{row.message}</td>
                  <td className="px-5 py-3 text-sm text-muted">{formatDate(row.createdAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export default async function DataQaPage() {
  await requireAdmin();
  const snapshot = await getDataQaSnapshot();

  return (
    <main className="min-h-screen bg-bg px-8 py-10 text-ink">
      <div className="mx-auto max-w-[1440px] space-y-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-accent">Admin</p>
            <h1
              className="mt-2 text-5xl tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Data QA
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-muted">
              Internal checks for source documents, ingestion runs, variable mappings,
              quality flags, and scored outputs before public use.
            </p>
          </div>
          <Link
            href="/"
            className="rounded-[10px] border border-border px-4 py-2 text-sm font-semibold text-muted hover:border-accent hover:text-ink"
          >
            Back to site
          </Link>
        </div>

        <SummaryCards snapshot={snapshot} />

        <section>
          <SectionLabel>Latest Ingestion Runs</SectionLabel>
          <IngestionRunsTable rows={snapshot.ingestionRuns} />
        </section>

        <section>
          <SectionLabel>Source Documents</SectionLabel>
          <SourceDocumentsTable rows={snapshot.sourceDocuments} />
        </section>

        <section>
          <SectionLabel>Variable Mappings</SectionLabel>
          <MappingsTable rows={snapshot.variableMappings} />
        </section>

        <section>
          <SectionLabel>Score Review</SectionLabel>
          <ScoreReviewTable rows={snapshot.scoreReviewRows} />
        </section>

        <section>
          <SectionLabel>Quality Flags</SectionLabel>
          <FlagsTable rows={snapshot.dataQualityFlags} />
        </section>
      </div>
    </main>
  );
}
