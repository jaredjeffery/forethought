// /variables — browseable list of all tracked economic variables.

import { db } from "@/lib/db";
import { variables, actuals } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import Link from "next/link";

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

const selectClass =
  "text-sm border border-border rounded px-3 py-2 bg-white text-ink focus:border-accent focus:outline-none";

interface PageProps {
  searchParams: Promise<{ country?: string; category?: string }>;
}

export default async function VariablesPage({ searchParams }: PageProps) {
  const { country, category } = await searchParams;
  const { rows, latestActualsMap } = await getVariables(country, category);

  return (
    <div className="space-y-10">
      <div>
        <h1
          className="text-5xl text-ink tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Variables
        </h1>
        <div className="mt-2 h-[3px] w-12 bg-accent" />
      </div>

      <form className="flex flex-wrap items-center gap-3">
        <select name="country" defaultValue={country ?? ""} className={selectClass}>
          <option value="">All countries</option>
          {COUNTRY_OPTIONS.map((c) => (
            <option key={c.code} value={c.code}>{c.label}</option>
          ))}
        </select>
        <select name="category" defaultValue={category ?? ""} className={selectClass}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <button
          type="submit"
          className="text-sm px-4 py-2 bg-accent text-white rounded hover:bg-accent-dark transition-colors duration-200"
        >
          Filter
        </button>
        {(country || category) && (
          <Link
            href="/variables"
            className="text-sm px-4 py-2 border border-border rounded hover:border-accent transition-colors"
          >
            Clear
          </Link>
        )}
        <span className="ml-auto text-sm text-muted">{rows.length} variables</span>
      </form>

      {rows.length === 0 ? (
        <p className="text-base text-muted py-8">No variables match the selected filters.</p>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="min-w-full">
            <thead className="border-b border-border bg-tinted">
              <tr className="text-xs font-bold tracking-wider text-muted uppercase">
                <th className="text-left px-5 py-3">Variable</th>
                <th className="text-left px-5 py-3">Country</th>
                <th className="text-left px-5 py-3">Unit</th>
                <th className="text-right px-5 py-3">Latest actual</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((v) => {
                const latest = latestActualsMap.get(v.id);
                const val = latest ? parseFloat(latest.value) : null;
                return (
                  <tr key={v.id} className="hover:bg-tinted transition-colors">
                    <td className="px-5 py-3.5">
                      <Link href={`/variables/${v.id}`} className="text-base font-medium text-ink hover:text-accent transition-colors">
                        {v.name}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm font-medium tracking-wide text-muted">{v.countryCode}</span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-muted">{v.unit}</td>
                    <td className="px-5 py-3.5 text-right tabular-nums" style={{ fontFamily: "var(--font-mono)" }}>
                      {latest && val !== null ? (
                        <span className={val >= 0 ? "text-signal-green" : "text-signal-red"}>
                          {val > 0 ? "+" : ""}{val.toFixed(2)}
                          <span className="text-muted ml-2 text-xs">{latest.targetPeriod}</span>
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
      )}
    </div>
  );
}
