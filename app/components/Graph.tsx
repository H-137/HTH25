"use client";
/* eslint-disable */

import { Line } from "react-chartjs-2";
// import Papa from 'https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js'; // REMOVED: This was causing a "Dynamic require" error
import { useEffect, useMemo, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Legend,
} from "chart.js";

ChartJS.register(
  LinearScale,
  PointElement,
  LineElement,
  Title,
  CategoryScale,
  Legend
);

type Coords = { lat: number; long: number };

// --- NEW: More specific types for our data ---
type ClimateDataRow = {
  Year: number;
  "Annual Average Temperature (F)": number;
};

type YearlyPoint = { year: number; avg: number };

type PredictionData = {
  city: string;
  state: string;
  predictions: {
    years: number[];
    temperatures: number[];
    avg_temp: number;
  };
  // ... other fields from your API response
};
// ------------------------------------------

export default function Graph({
  title,
  average,
  coords,
}: {
  title: string;
  average: boolean;
  coords?: Coords;
}) {
  // CSV fallback state, used only when coords is undefined
  const [csvData, setCsvData] = useState<ClimateDataRow[]>([]);
  const [csvLoading, setCsvLoading] = useState(true);

  // API-driven yearly data
  const [yearly, setYearly] = useState<YearlyPoint[]>([]);
  const [range, setRange] = useState<{ start: string; end: string }>();
  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState<string>("");

  // --- MODIFIED: State for prediction data from /api/predict ---
  const [prediction, setPrediction] = useState<PredictionData | null>(null);
  const [predictionLoading, setPredictionLoading] = useState(false);
  const [predictionError, setPredictionError] = useState<string>("");
  // ---------------------------------------------------------

  const options = {
    responsive: true,
    plugins: {
      legend: { position: "top" as const },
      title: {
        display: true,
        // show range when we are plotting the city series
        text: range ? `${title}  •  ${range.start} to ${range.end}` : title,
      },
    },
  };

  // fallback CSV load, runs once
  useEffect(() => {
    if (coords) return; // skip CSV when we have coords

    // MODIFIED: Access Papa from the window object, as the import is not supported
    const Papa = (window as any).Papa;

    if (Papa) {
      Papa.parse("/static/temps.csv", {
        download: true,
        header: true,
        dynamicTyping: true,
        // @ts-ignore
        complete: (results: any) => {
          // Use 'any' type as Papa is not imported
          setCsvData(results.data as ClimateDataRow[]);
          setCsvLoading(false);
        },
        // @ts-ignore
        error: (error: any) => {
          console.error("Error parsing CSV:", error);
          setCsvLoading(false);
        },
      });
    } else {
      console.error(
        "PapaParse (Papa) library not found on window object. CSV will not load."
      );
      setCsvLoading(false); // Set loading to false so the app doesn't hang
    }
  }, [coords]); // depend on coords to skip

  // localStorage cache key for the given coords
  const cacheKey = useMemo(() => {
    if (!coords) return null;
    return `yearly-temp:${coords.lat.toFixed(3)},${coords.long.toFixed(3)}`;
  }, [coords]);

  // try read cache first
  useEffect(() => {
    if (!cacheKey) return;
    try {
      const raw = localStorage.getItem(cacheKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed?.data)) {
          setYearly(parsed.data);
          if (parsed.start && parsed.end)
            setRange({ start: parsed.start, end: parsed.end });
        }
      }
    } catch {}
  }, [cacheKey]);

  // fetch yearly series from our API when coords change
  useEffect(() => {
    if (!coords) return;
    setApiLoading(true);
    setApiError("");
    // NEW: Clear prediction data on new coord fetch
    setPrediction(null);
    setPredictionError("");
    (async () => {
      try {
        const q = new URLSearchParams({
          lat: String(coords.lat),
          long: String(coords.long),
        });
        // This fetch remains as-is, as it's for HISTORICAL data
        const res = await fetch(`/api/historical_temp?${q.toString()}`);
        const data = await res.json();
        if (!res.ok || data?.error) {
          // FIX: Ensure error is a string
          const errorMsg =
            data?.error && typeof data.error === "string"
              ? data.error
              : JSON.stringify(data?.error) ||
                "failed to fetch historical series";
          setApiError(errorMsg);
          setYearly([]);
          return;
        }
        const pts: YearlyPoint[] = Array.isArray(data.data) ? data.data : [];
        setYearly(pts);
        if (data.start && data.end)
          setRange({ start: data.start, end: data.end });
        if (cacheKey) {
          localStorage.setItem(
            cacheKey,
            JSON.stringify({
              start: data.start,
              end: data.end,
              coords,
              fetchedAt: new Date().toISOString(),
              data: pts,
            })
          );
        }
        // @ts-ignore
      } catch (e: any) {
        setApiError(`unexpected error loading series: ${e.message}`);
        setYearly([]);
      } finally {
        setApiLoading(false);
      }
    })();
  }, [coords, cacheKey]);

  // --- NEW: useEffect to call /api/predict after historical data is fetched ---
  useEffect(() => {
    // Only run if we have coords, historical data (yearly), and are not already loading
    if (!coords || yearly.length === 0 || apiLoading) {
      return;
    }

    setPredictionLoading(true);
    setPredictionError("");
    setPrediction(null);

    (async () => {
      try {
        // Construct the body for the 'manual' prediction route
        const body = {
          city: title,
          state: "N/A", // Sending a placeholder as 'state' seems to be required
          lat: coords.lat,
          lon: coords.long, // Note: 'lon' for the API, 'long' from our props
          historical_years: yearly.map((p) => p.year),
          historical_temps: yearly.map((p) => p.avg),
        };

        const res = await fetch("/api/gru", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            accept: "application/json",
          },
          body: JSON.stringify(body),
        });

        const data = await res.json();

        if (!res.ok) {
          let errorMsg = "Failed to get prediction";
          if (data.error && typeof data.error === "string") {
            errorMsg = data.error;
          } else if (data.detail) {
            errorMsg = JSON.stringify(data.detail); // Stringify the object/array
          }
          setPredictionError(errorMsg);
          return;
        }

        // MODIFIED: Set the prediction state with the typed data
        setPrediction(data as PredictionData);
        // @ts-ignore
      } catch (e: any) {
        setPredictionError(`Prediction request failed: ${e.message}`);
      } finally {
        setPredictionLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yearly, coords, title]); // Runs when historical data (yearly) changes
  // Note: apiLoading is intentionally omitted to allow this to run *after* apiLoading is false

  function movingAverage(series: number[], windowSize: number) {
    return series.map((_, idx, arr) => {
      const start = Math.max(0, idx - Math.floor(windowSize / 2));
      const end = Math.min(arr.length, idx + Math.floor(windowSize / 2));
      const subset = arr.slice(start, end + 1);
      return subset.reduce((a, b) => a + b, 0) / subset.length;
    });
  }

  // --- REFACTORED: Chart Data Processing ---
  const isCityMode = Boolean(coords);
  // @ts-ignore
  let chartLabels: (string | number)[] = [];
  // Use a more specific type for chart datasets
  let chartDatasets: ChartJS<"line">["data"]["datasets"] = [];

  if (isCityMode) {
    // City Mode: Combine historical + prediction
    const historicalLabels = yearly.map((p) => p.year);
    const futureLabels = prediction?.predictions?.years || [];
    chartLabels = [...historicalLabels, ...futureLabels];

    const historicalData = yearly.map((p) => p.avg);
    // Pad historical data with nulls for the future
    const paddedMainSeries = [
      ...historicalData,
      ...Array(futureLabels.length).fill(null),
    ];

    chartDatasets.push({
      label: "Annual Average Temperature (F)",
      data: paddedMainSeries,
      borderColor: "rgba(229, 62, 62, 1)",
      backgroundColor: "rgba(255, 255, 255, 0.2)",
    });

    if (average) {
      const historicalAvgData = movingAverage(historicalData, 11);
      // Pad average data with nulls for the future
      const paddedAvgSeries = [
        ...historicalAvgData,
        ...Array(futureLabels.length).fill(null),
      ];
      chartDatasets.push({
        label: "11-Year Moving Average",
        data: paddedAvgSeries,
        borderColor: "rgba(62, 137, 229, 1)",
        backgroundColor: "rgba(255, 255, 255, 0.2)",
      });
    }

    if (prediction?.predictions) {
      const predictionData = prediction.predictions.temperatures || [];
      // Pad prediction data with nulls for the past
      const predictionSeries = [
        ...Array(historicalLabels.length).fill(null),
        ...predictionData,
      ];
      chartDatasets.push({
        label: "Predicted Temperature",
        data: predictionSeries,
        borderColor: "rgba(234, 179, 8, 1)", // Gold color
        backgroundColor: "rgba(234, 179, 8, 0.2)",
        borderDash: [5, 5], // Dashed line
      });
    }
  } else {
    // CSV Fallback Mode: Just historical
    chartLabels = csvData.map((row) => row.Year);
    const csvMainSeries = csvData.map(
      (row) => row["Annual Average Temperature (F)"]
    );

    chartDatasets.push({
      label: "Annual Average Temperature (F)",
      data: csvMainSeries,
      borderColor: "rgba(229, 62, 62, 1)",
      backgroundColor: "rgba(255, 255, 255, 0.2)",
    });

    if (average) {
      const csvAvgSeries = movingAverage(csvMainSeries, 11);
      chartDatasets.push({
        label: "11-Year Moving Average",
        data: csvAvgSeries,
        borderColor: "rgba(62, 137, 229, 1)",
        backgroundColor: "rgba(255, 255, 255, 0.2)",
      });
    }
  }
  // --- END REFACTORED BLOCK ---

  return (
    <div>
      {/* --- SIMPLIFIED: Only one <Line> component is needed now --- */}
      {isCityMode ? (
        // City Mode View
        <>
          {apiLoading && <p>Loading historical data...</p>}
          {!apiLoading && apiError && (
            <p style={{ color: "red" }}>
              Error loading historical data: {apiError}
            </p>
          )}
          {!apiLoading && !apiError && yearly.length > 0 && (
            <>
              {/* The chart now includes predictions */}
              <Line
                options={options}
                data={{
                  labels: chartLabels,
                  datasets: chartDatasets,
                }}
              />

              {/* Display for prediction results text */}
              <div
                style={{
                  marginTop: "20px",
                  padding: "10px",
                  border: "1px solid #ccc",
                  borderRadius: "8px",
                }}
              >
                <h4 style={{ marginTop: "0" }}>Future Prediction</h4>
                {predictionLoading && <p>Loading prediction...</p>}
                {predictionError && (
                  <p style={{ color: "red" }}>
                    Prediction Error: {predictionError}
                  </p>
                )}
                {prediction && (
                  <div>
                    <div style={{ marginBottom: "0" }}>
                      <strong>
                        Predicted Avg Temp (2026-
                        {prediction.predictions.years.slice(-1)[0] || "2045"}):
                      </strong>
                      {/* MODIFIED: Use the specific type */}
                      {prediction.predictions &&
                      prediction.predictions.avg_temp ? (
                        ` ${prediction.predictions.avg_temp.toFixed(2)} °F`
                      ) : (
                        // Fallback in case the response is different
                        <pre
                          style={{
                            display: "block",
                            marginTop: "10px",
                            background: "#f4f4f4",
                            padding: "10px",
                            borderRadius: "4px",
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-all",
                          }}
                        >
                          {JSON.stringify(prediction, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>
                )}
              </div>
              {/* ------------------------------------------- */}
            </>
          )}
        </>
      ) : (
        // CSV fallback, unchanged view
        <>
          {csvLoading ? (
            <p>Loading data...</p>
          ) : (
            <Line
              options={options}
              data={{
                labels: chartLabels,
                datasets: chartDatasets,
              }}
            />
          )}
        </>
      )}
    </div>
  );
}
