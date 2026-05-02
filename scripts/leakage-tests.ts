// Leakage tests for public/free forecast data boundaries.
// Requires a production build; run `npm run build` first.
// Run with: node --env-file=.env.local node_modules/tsx/dist/cli.mjs scripts/leakage-tests.ts

import { spawn, type ChildProcessWithoutNullStreams } from "child_process";
import { readFileSync } from "fs";
import { join } from "path";
import { db } from "../src/lib/db";
import { consensusForecasts, forecasts, forecasters, variables } from "../src/lib/db/schema";
import { eq } from "drizzle-orm";

type Failure = {
  name: string;
  detail: string;
};

const failures: Failure[] = [];

function check(name: string, condition: boolean, detail: string) {
  if (!condition) failures.push({ name, detail });
}

function collectForbiddenKeys(
  value: unknown,
  forbidden: Set<string>,
  path = "$",
  found: string[] = [],
) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectForbiddenKeys(item, forbidden, `${path}[${index}]`, found));
    return found;
  }

  if (value && typeof value === "object") {
    for (const [key, nested] of Object.entries(value)) {
      const nextPath = `${path}.${key}`;
      if (forbidden.has(key)) found.push(nextPath);
      collectForbiddenKeys(nested, forbidden, nextPath, found);
    }
  }

  return found;
}

function assertNoForbiddenKeys(name: string, payload: unknown, keys: string[]) {
  const found = collectForbiddenKeys(payload, new Set(keys));
  check(name, found.length === 0, `Forbidden keys found: ${found.join(", ")}`);
}

function assertNoSampleValues(name: string, payload: unknown, values: string[]) {
  const serialized = JSON.stringify(payload);
  const leaked = values.filter((value) => value && serialized.includes(value));
  check(name, leaked.length === 0, `Sample premium values found in payload: ${leaked.join(", ")}`);
}

function assertSourceDoesNotContain(name: string, relativePath: string, terms: string[]) {
  const text = readFileSync(join(process.cwd(), relativePath), "utf-8");
  const found = terms.filter((term) => text.includes(term));
  check(name, found.length === 0, `Forbidden source terms found: ${found.join(", ")}`);
}

async function waitForServer(baseUrl: string, server: ChildProcessWithoutNullStreams) {
  const deadline = Date.now() + 30_000;
  let lastError = "";

  while (Date.now() < deadline) {
    if (server.exitCode != null) {
      throw new Error(`Next server exited early with code ${server.exitCode}`);
    }

    try {
      const response = await fetch(`${baseUrl}/api/forecasters`);
      if (response.status < 500) return;
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Timed out waiting for Next server at ${baseUrl}: ${lastError}`);
}

async function withNextServer<T>(fn: (baseUrl: string) => Promise<T>): Promise<T> {
  if (process.env.LEAKAGE_BASE_URL) {
    return fn(process.env.LEAKAGE_BASE_URL);
  }

  const port = process.env.LEAKAGE_TEST_PORT ?? "3107";
  const baseUrl = `http://127.0.0.1:${port}`;
  const server = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "start", "-H", "127.0.0.1", "-p", port],
    { cwd: process.cwd(), env: process.env },
  );

  let output = "";
  server.stdout.on("data", (chunk) => {
    output += String(chunk);
  });
  server.stderr.on("data", (chunk) => {
    output += String(chunk);
  });

  try {
    await waitForServer(baseUrl, server);
    return await fn(baseUrl);
  } catch (error) {
    if (output.trim()) {
      console.error("Next server output:");
      console.error(output.trim());
    }
    throw error;
  } finally {
    server.kill();
  }
}

async function main() {
  const [sampleForecast] = await db
    .select({
      variableId: forecasts.variableId,
      variableSlug: variables.slug,
      forecasterSlug: forecasters.slug,
      forecastValue: forecasts.value,
    })
    .from(forecasts)
    .innerJoin(forecasters, eq(forecasters.id, forecasts.forecasterId))
    .innerJoin(variables, eq(variables.id, forecasts.variableId))
    .limit(1);

  if (!sampleForecast) {
    throw new Error("No forecasts available for leakage tests");
  }

  const [sampleConsensus] = await db
    .select({
      variableId: consensusForecasts.variableId,
      simpleMean: consensusForecasts.simpleMean,
      weightedMean: consensusForecasts.weightedMean,
    })
    .from(consensusForecasts)
    .limit(1);

  const premiumSampleValues = [
    sampleForecast.forecastValue,
    sampleConsensus?.simpleMean,
    sampleConsensus?.weightedMean,
  ].filter((value): value is string => Boolean(value));

  await withNextServer(async (baseUrl) => {
    const forecasterResponse = await fetch(`${baseUrl}/api/forecasters/${sampleForecast.forecasterSlug}`);
    check("public forecaster API status", forecasterResponse.status === 200, `Expected 200, got ${forecasterResponse.status}`);

    const forecasterJson = await forecasterResponse.json() as unknown;
    assertNoForbiddenKeys("public forecaster API forbidden fields", forecasterJson, [
      "value",
      "lowerCi",
      "upperCi",
      "forecastMadeAt",
      "absoluteError",
      "percentageError",
      "signedError",
      "directionalCorrect",
      "scoreVsConsensus",
      "avgAbsoluteError",
      "avgBias",
      "avgScoreVsConsensus",
      "simpleMean",
      "weightedMean",
    ]);
    assertNoSampleValues("public forecaster API sample values", forecasterJson, premiumSampleValues);

    const forecasterHtmlResponse = await fetch(`${baseUrl}/forecasters/${sampleForecast.forecasterSlug}`);
    const forecasterHtml = await forecasterHtmlResponse.text();
    check(
      "public forecaster page status",
      forecasterHtmlResponse.status === 200,
      `Expected 200, got ${forecasterHtmlResponse.status}`,
    );
    assertNoSampleValues("public forecaster page sample values", forecasterHtml, premiumSampleValues);

    const landingResponse = await fetch(baseUrl);
    const landingHtml = await landingResponse.text();
    check(
      "public landing page status",
      landingResponse.status === 200,
      `Expected 200, got ${landingResponse.status}`,
    );
    assertNoSampleValues("public landing page sample values", landingHtml, premiumSampleValues);
    check(
      "public landing page avoids accuracy leaderboard",
      !landingHtml.includes("Accuracy Leaderboard") && !landingHtml.includes("MAE"),
      "Accuracy leaderboard terms found in public landing HTML",
    );

    const variableResponse = await fetch(`${baseUrl}/api/variables/${sampleForecast.variableSlug}`);
    check("public variable API status", variableResponse.status === 200, `Expected 200, got ${variableResponse.status}`);

    const variableJson = await variableResponse.json() as unknown;
    assertNoForbiddenKeys("public variable API forbidden fields", variableJson, [
      "forecasts",
      "consensus",
      "forecastValue",
      "forecastMadeAt",
      "lowerCi",
      "upperCi",
      "absoluteError",
      "percentageError",
      "scoreVsConsensus",
      "simpleMean",
      "weightedMean",
    ]);

    const variableHtmlResponse = await fetch(`${baseUrl}/variables/${sampleForecast.variableSlug}`);
    const variableHtml = await variableHtmlResponse.text();
    check(
      "public variable page status",
      variableHtmlResponse.status === 200,
      `Expected 200, got ${variableHtmlResponse.status}`,
    );
    check(
      "public variable page avoids consensus fields",
      !variableHtml.includes("simpleMean") && !variableHtml.includes("weightedMean"),
      "Consensus field names found in public variable HTML",
    );

    const forecastsResponse = await fetch(`${baseUrl}/api/forecasts?variable_id=${sampleForecast.variableId}`);
    check("public forecasts API blocks values", forecastsResponse.status === 403, `Expected 403, got ${forecastsResponse.status}`);

    if (sampleConsensus) {
      const consensusResponse = await fetch(`${baseUrl}/api/consensus?variable_id=${sampleConsensus.variableId}`);
      check("public consensus API blocks values", consensusResponse.status === 403, `Expected 403, got ${consensusResponse.status}`);
    }

    const adminResponse = await fetch(`${baseUrl}/admin/data-qa`, { redirect: "manual" });
    check(
      "public admin QA page requires auth",
      [302, 303, 307, 308].includes(adminResponse.status)
        && (adminResponse.headers.get("location")?.includes("/signin") ?? false),
      `Expected redirect to signin, got ${adminResponse.status} ${adminResponse.headers.get("location") ?? ""}`,
    );
  });

  assertSourceDoesNotContain(
    "public forecaster page source avoids detailed metrics",
    "src/app/(public)/forecasters/[slug]/page.tsx",
    ["avgAbsoluteError", "avgBias", "avgScoreVsConsensus", "scoreVsConsensus"],
  );
  assertSourceDoesNotContain(
    "public forecaster directory source avoids detailed metrics",
    "src/app/(public)/forecasters/page.tsx",
    ["avgAbsoluteError", "avgBias", "avgScoreVsConsensus", "scoreVsConsensus"],
  );

  if (failures.length > 0) {
    console.error("Leakage tests failed:");
    for (const failure of failures) {
      console.error(`- ${failure.name}: ${failure.detail}`);
    }
    process.exit(1);
  }

  console.log("Leakage tests passed.");
  console.log(`Checked public forecaster: ${sampleForecast.forecasterSlug}`);
  console.log(`Checked public variable: ${sampleForecast.variableSlug}`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
