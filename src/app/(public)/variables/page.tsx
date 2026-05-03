// /variables — browseable list of all tracked economic variables.

import { db } from "@/lib/db";
import { variables, actuals } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import Link from "next/link";
import { Card } from "@/components/ui/Card";

export const revalidate = 3600;

const CATEGORIES = ["MACRO", "COMMODITY", "FINANCIAL", "POLITICAL"] as const;

const COUNTRY_OPTIONS = [
  { code: "WLD", label: "World" },
  { code: "ADV", label: "Advanced Economies" },
  { code: "EME", label: "Emerging & Developing" },
  { code: "EA",  label: "Euro Area" },
  { code: "G7",  label: "G7" },
  { code: "USA", label: "United States" },
  { code: "CHN", label: "China" },
  { code: "DEU", label: "Germany" },
  { code: "JPN", label: "Japan" },
  { code: "IND", label: "India" },
  { code: "GBR", label: "United Kingdom" },
  { code: "FRA", label: "France" },
  { code: "BRA", label: "Brazil" },
  { code: "ZAF", label: "South Africa" },
  { code: "AUS", label: "Australia" },
  { code: "CAN", label: "Canada" },
  { code: "KOR", label: "South Korea" },
  { code: "MEX", label: "Mexico" },
  { code: "RUS", label: "Russia" },
  { code: "SAU", label: "Saudi Arabia" },
];

async function getVariables(country?: string, category?: string) {
  const conditions = [];
  if (country) conditions.push(eq(variables.countryCode, country));
  if (category) conditions.push(eq(variables.category, category as typeof CATEGORIES[number]));

  const rows = await db
    .select()
    .from(variables)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(variables.countryCode, variables.name);

  const latestActualsMap = new Map<string, { value: string; targetPeriod: string }>();
  if (rows.length > 0) {
    const variableIds = rows.map((v) => v.id);
    const latestActuals = await db
      .select()
      .from(actuals)
      .where(inArray(actuals.variableId, variableIds))
      .orderBy(actuals.targetPeriod);
    for (const a of latestActuals) {
      latestActualsMap.set(a.variableId, { value: a.value, targetPeriod: a.targetPeriod });
    }
  }

  return { rows, latestActualsMap };
}

const inputClass =
  "text-sm border border-border-strong rounded-[10px] px-3.5 py-2 bg-surface text-ink focus:border-cobalt focus:outline-none focus:ring-2 focus:ring-cobalt/20 transition-colors";

interface PageProps {
  searchParams: Promise<{ country?: string; category?: string }>;
}

export default async function VariablesPage({ searchParams }: PageProps) {
  const { country, category } = await searchParams;
  const { rows, latestActualsMap } = await getVariables(country, category);

  return (
    <div className="space-y-10">
      <div>
        <p className="section-label">Directory</p>
        <h1
          className="mt-3 text-5xl tracking-tight text-ink"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Variables
        </h1>
        <span className="accent-rule" />
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted">
          Every tracked variable, with the latest actual reading and a click-through to the
          full record. Filter by country or category.
        </p>
      </div>

      <form className="flex flex-wrap items-center gap-3">
        <select name="country" defaultValue={country ?? ""} className={inputClass}>
          <option value="">All countries</option>
          {COUNTRY_OPTIONS.map((c) => (
            <option key={c.code} value={c.code}>{c.label}</option>
          ))}
        </select>
        <select name="category" defaultValue={category ?? ""} className={inputClass}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <button type="submit" className="btn-primary">
          Filter
        </button>
        {(country || category) && (
          <Link href="/variables" className="btn-secondary">
            Clear
          </Link>
        )}
        <span className="ml-auto text-sm text-muted">{rows.length} variables</span>
      </form>

      {rows.length === 0 ? (
        <p className="text-base text-muted py-8">No variables match the selected filters.</p>
      ) : (
        <Card padding="none">
          <div className="overflow-hidden">
            <table className="min-w-full">
              <thead className="border-b border-border bg-bg">
                <tr className="text-xs font-bold tracking-wider text-muted uppercase">
                  <th className="text-left px-6 py-3">Variable</th>
                  <th className="text-left px-6 py-3">Country</th>
                  <th className="text-left px-6 py-3">Unit</th>
                  <th className="text-right px-6 py-3">Latest actual</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((v) => {
                  const latest = latestActualsMap.get(v.id);
                  const val = latest ? parseFloat(latest.value) : null;
                  return (
                    <tr key={v.id} className="hover:bg-bg transition-colors">
                      <td className="px-6 py-4">
                        <Link
                          href={`/variables/${v.slug}`}
                          className="text-base font-semibold text-ink transition-colors hover:text-cobalt"
                        >
                          {v.name}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm font-semibold tracking-wide text-muted">{v.countryCode}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted">{v.unit}</td>
                      <td
                        className="px-6 py-4 text-right tabular-nums"
                        style={{ fontFamily: "var(--font-mono)" }}
                      >
                        {latest && val !== null ? (
                          <span className={val >= 0 ? "font-semibold text-cobalt" : "font-semibold text-coral"}>
                            {val > 0 ? "+" : ""}{val.toFixed(2)}
                            <span className="ml-2 text-xs font-normal text-muted">{latest.targetPeriod}</span>
                          </span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
