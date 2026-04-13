// /variables — browseable list of all tracked economic variables.
// Server component with country and category filter support via searchParams.

import { db } from "@/lib/db";
import { variables, actuals } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import Link from "next/link";

export const revalidate = 3600;

const CATEGORIES = ["MACRO", "COMMODITY", "FINANCIAL", "POLITICAL"] as const;

// Country options shown in the filter dropdown (aggregates first, then individuals)
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

  // Fetch latest actual for each variable
  const latestActualsMap = new Map<string, { value: string; targetPeriod: string }>();
  if (rows.length > 0) {
    const variableIds = rows.map((v) => v.id);
    const latestActuals = await db
      .select()
      .from(actuals)
      .where(inArray(actuals.variableId, variableIds))
      .orderBy(actuals.targetPeriod);

    // Keep only the latest per variable (last in ordered results wins)
    for (const a of latestActuals) {
      latestActualsMap.set(a.variableId, { value: a.value, targetPeriod: a.targetPeriod });
    }
  }

  return { rows, latestActualsMap };
}

interface PageProps {
  searchParams: Promise<{ country?: string; category?: string }>;
}

export default async function VariablesPage({ searchParams }: PageProps) {
  const { country, category } = await searchParams;
  const { rows, latestActualsMap } = await getVariables(country, category);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Variables</h1>
        <span className="text-sm text-gray-500">{rows.length} variables</span>
      </div>

      {/* Filters */}
      <form className="flex flex-wrap gap-3">
        <select
          name="country"
          defaultValue={country ?? ""}
          className="text-sm border border-gray-300 rounded-md px-3 py-1.5 bg-white"
        >
          <option value="">All countries</option>
          {COUNTRY_OPTIONS.map((c) => (
            <option key={c.code} value={c.code}>{c.label}</option>
          ))}
        </select>
        <select
          name="category"
          defaultValue={category ?? ""}
          className="text-sm border border-gray-300 rounded-md px-3 py-1.5 bg-white"
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <button
          type="submit"
          className="text-sm px-3 py-1.5 bg-gray-900 text-white rounded-md hover:bg-gray-700 transition-colors"
        >
          Filter
        </button>
        {(country || category) && (
          <Link
            href="/variables"
            className="text-sm px-3 py-1.5 border border-gray-300 rounded-md hover:border-gray-400 transition-colors"
          >
            Clear
          </Link>
        )}
      </form>

      {/* Variable table */}
      {rows.length === 0 ? (
        <p className="text-sm text-gray-500 py-8">No variables match the selected filters.</p>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Variable</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Country</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Unit</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Latest actual</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((v) => {
                const latest = latestActualsMap.get(v.id);
                return (
                  <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/variables/${v.id}`} className="font-medium hover:underline">
                        {v.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{v.countryCode}</td>
                    <td className="px-4 py-3 text-gray-500">{v.unit}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-800">
                      {latest
                        ? `${parseFloat(latest.value).toFixed(2)} (${latest.targetPeriod})`
                        : <span className="text-gray-400">—</span>
                      }
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
