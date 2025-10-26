"use client";

import { useEffect, useMemo, useState } from "react";
import Widget from "./Widget";

type Location = {
  lat: number;
  long: number;
};

type YearlyTemp = {
  year: number;
  avg: number;
};

type RainfallYear = {
  year: number;
  count: number;
};

type TemperatureFacts = {
  changePerYear: number | null;
  changePerDecade: number | null;
  warmestYear: YearlyTemp | null;
  coldestYear: YearlyTemp | null;
  firstDecadeAverage: number | null;
  lastDecadeAverage: number | null;
};

type RainfallFacts = {
  averageWetDays: number | null;
  wettestYear: RainfallYear | null;
  changePerYear: number | null;
};

type FactsState = {
  temperature: TemperatureFacts;
  rainfall: RainfallFacts;
};

const defaultFacts: FactsState = {
  temperature: {
    changePerYear: null,
    changePerDecade: null,
    warmestYear: null,
    coldestYear: null,
    firstDecadeAverage: null,
    lastDecadeAverage: null,
  },
  rainfall: {
    averageWetDays: null,
    wettestYear: null,
    changePerYear: null,
  },
};

function average(values: number[]): number | null {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function formatNumber(value: number | null, fractionDigits = 1): string {
  if (value === null || Number.isNaN(value)) return "—";
  return value.toFixed(fractionDigits);
}

async function fetchHistoricalTemps(
  location: Location,
  signal: AbortSignal
): Promise<YearlyTemp[]> {
  const params = new URLSearchParams({
    lat: String(location.lat),
    long: String(location.long),
  });
  const response = await fetch(`/api/historical_temp?${params}`, { signal });
  const data = await response.json();

  if (!response.ok || data?.error || !Array.isArray(data?.data)) {
    const errorMessage =
      typeof data?.error === "string"
        ? data.error
        : "Unable to load temperature history.";
    throw new Error(errorMessage);
  }

  return (data.data as YearlyTemp[]).sort((a, b) => a.year - b.year);
}

async function fetchRainfallCounts(
  location: Location,
  signal: AbortSignal
): Promise<RainfallYear[]> {
  const params = new URLSearchParams({
    lat: String(location.lat),
    lon: String(location.long),
  });
  const response = await fetch(`/api/extreme?${params}`, { signal });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    const message =
      data?.error && typeof data.error === "string"
        ? data.error
        : "Unable to load rainfall history.";
    throw new Error(message);
  }

  if (!response.body) {
    throw new Error("No rainfall data stream available.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const values = new Map<number, number>();
  let pending = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    pending += decoder.decode(value, { stream: true });
    const lines = pending.split("\n");
    pending = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const parsed = JSON.parse(line) as Partial<RainfallYear> & {
          error?: string;
        };
        if (parsed.error) {
          throw new Error(parsed.error);
        }
        let year: number | null = null;
        if (typeof parsed.year === "string") {
          year = Number(parsed.year);
        } else if (typeof parsed.year === "number") {
          year = parsed.year;
        }

        if (
          year !== null &&
          Number.isFinite(year) &&
          typeof parsed.count === "number"
        ) {
          values.set(year, parsed.count);
        }
      } catch (err) {
        console.error("Failed to parse rainfall chunk", err);
      }
    }
  }

  return Array.from(values.entries())
    .map(([year, count]) => ({ year, count }))
    .sort((a, b) => a.year - b.year);
}

function computeTemperatureFacts(data: YearlyTemp[]): TemperatureFacts {
  if (!data.length) return defaultFacts.temperature;

  const warmestYear = data.reduce((max, current) =>
    current.avg > max.avg ? current : max
  );
  const coldestYear = data.reduce((min, current) =>
    current.avg < min.avg ? current : min
  );

  const first = data[0];
  const last = data[data.length - 1];
  const yearsBetween = last.year - first.year;

  const changePerYear =
    yearsBetween > 0 ? (last.avg - first.avg) / yearsBetween : null;
  const changePerDecade =
    changePerYear !== null ? changePerYear * 10 : null;

  const decadeWindow = Math.min(10, data.length);
  const firstDecadeAverage = average(
    data.slice(0, decadeWindow).map((point) => point.avg)
  );
  const lastDecadeAverage = average(
    data.slice(-decadeWindow).map((point) => point.avg)
  );

  return {
    changePerYear,
    changePerDecade,
    warmestYear,
    coldestYear,
    firstDecadeAverage,
    lastDecadeAverage,
  };
}

function computeRainfallFacts(data: RainfallYear[]): RainfallFacts {
  if (!data.length) return defaultFacts.rainfall;

  const wettestYear = data.reduce((max, current) =>
    current.count > max.count ? current : max
  );
  const first = data[0];
  const last = data[data.length - 1];
  const yearsBetween = last.year - first.year;

  const changePerYear =
    yearsBetween > 0 ? (last.count - first.count) / yearsBetween : null;

  return {
    averageWetDays: average(data.map((point) => point.count)),
    wettestYear,
    changePerYear,
  };
}

export default function Facts({ location }: { location: Location | null }) {
  const [facts, setFacts] = useState<FactsState>(defaultFacts);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasLocation = useMemo(() => Boolean(location), [location]);

  useEffect(() => {
    if (!location) {
      setFacts(defaultFacts);
      setError(null);
      setLoading(false);
      return;
    }

    const abortController = new AbortController();
    let cancelled = false;

    const loadFacts = async () => {
      try {
        setLoading(true);
        setError(null);

        const [tempsResult, rainfallResult] = await Promise.allSettled([
          fetchHistoricalTemps(location, abortController.signal),
          fetchRainfallCounts(location, abortController.signal),
        ]);

        if (cancelled) return;

        if (tempsResult.status !== "fulfilled") {
          throw tempsResult.reason;
        }

        const rainfallData =
          rainfallResult.status === "fulfilled" ? rainfallResult.value : [];

        if (rainfallResult.status === "rejected") {
          console.warn("Rainfall facts unavailable:", rainfallResult.reason);
        }

        setFacts({
          temperature: computeTemperatureFacts(tempsResult.value),
          rainfall: computeRainfallFacts(rainfallData),
        });
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        console.error(err);
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Unable to compute facts."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadFacts();

    return () => {
      cancelled = true;
      abortController.abort();
    };
  }, [location]);

  return (
    <Widget>
      <div className="space-y-4">
        <h1 className="font-bold text-3xl bg-gradient-to-r from-sky-500 to-blue-400 bg-clip-text text-center text-transparent">
          Climate Quick Facts
        </h1>
        {!hasLocation && (
          <p className="text-gray-600 text-sm text-center">
            Select a location to surface tailored climate insights.
          </p>
        )}
        {hasLocation && loading && (
          <p className="text-gray-600 text-sm text-center">Crunching numbers…</p>
        )}
        {hasLocation && !loading && error && (
          <p className="text-red-500 text-sm text-center">{error}</p>
        )}
        {hasLocation && !loading && !error && (
          <div className="space-y-3 text-sm text-gray-700">
            <section>
              <h2 className="font-semibold text-base text-gray-900">
                Temperature Trends
              </h2>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                <li>
                  Average change per year:{" "}
                  <span className="font-medium">
                    {formatNumber(facts.temperature.changePerYear, 2)}°F
                  </span>
                </li>
                <li>
                  Average change per decade:{" "}
                  <span className="font-medium">
                    {formatNumber(facts.temperature.changePerDecade, 2)}°F
                  </span>
                </li>
                {facts.temperature.firstDecadeAverage !== null && (
                  <li>
                    First decade average:{" "}
                    <span className="font-medium">
                      {formatNumber(
                        facts.temperature.firstDecadeAverage
                      )}
                      °F
                    </span>
                  </li>
                )}
                {facts.temperature.lastDecadeAverage !== null && (
                  <li>
                    Most recent decade average:{" "}
                    <span className="font-medium">
                      {formatNumber(facts.temperature.lastDecadeAverage)}°F
                    </span>
                  </li>
                )}
                {facts.temperature.warmestYear && (
                  <li>
                    Warmest year:{" "}
                    <span className="font-medium">
                      {facts.temperature.warmestYear.year} (
                      {facts.temperature.warmestYear.avg.toFixed(1)}°F)
                    </span>
                  </li>
                )}
                {facts.temperature.coldestYear && (
                  <li>
                    Coolest year:{" "}
                    <span className="font-medium">
                      {facts.temperature.coldestYear.year} (
                      {facts.temperature.coldestYear.avg.toFixed(1)}°F)
                    </span>
                  </li>
                )}
              </ul>
            </section>

            <section>
              <h2 className="font-semibold text-base text-gray-900">
                Rainfall Extremes
              </h2>
              {facts.rainfall.averageWetDays === null ? (
                <p className="text-gray-600">
                  Rainfall history not available for this location.
                </p>
              ) : (
                <ul className="mt-1 list-disc space-y-1 pl-5">
                  <li>
                    Average rainy days (&gt;1mm) per year:{" "}
                    <span className="font-medium">
                      {formatNumber(facts.rainfall.averageWetDays, 1)} days
                    </span>
                  </li>
                  {facts.rainfall.changePerYear !== null && (
                    <li>
                      Change in wet days per year:{" "}
                      <span className="font-medium">
                        {formatNumber(facts.rainfall.changePerYear, 2)} days
                      </span>
                    </li>
                  )}
                  {facts.rainfall.wettestYear && (
                    <li>
                      Wettest year:{" "}
                      <span className="font-medium">
                        {facts.rainfall.wettestYear.year} (
                        {facts.rainfall.wettestYear.count} days)
                      </span>
                    </li>
                  )}
                </ul>
              )}
            </section>
          </div>
        )}
      </div>
    </Widget>
  );
}