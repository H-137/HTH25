'use client';

import { Line } from "react-chartjs-2";
import Papa from 'papaparse';
import { useEffect, useMemo, useState } from "react"; // CHANGED: added useMemo
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

// NEW: props now accept optional coords
type Coords = { lat: number, long: number }
export default function Graph({ title, average, coords }: { title: string, average: boolean, coords?: Coords }) {
  type ClimateDataRow = {
    Year: number;
    "Annual Average Temperature (F)": number;
  };

  // CSV fallback state, used only when coords is undefined
  const [csvData, setCsvData] = useState<ClimateDataRow[]>([]);
  const [csvLoading, setCsvLoading] = useState(true);

  // NEW: state for API-driven yearly data
  type YearlyPoint = { year: number, avg: number }
  const [yearly, setYearly] = useState<YearlyPoint[]>([])               // NEW
  const [range, setRange] = useState<{ start: string, end: string }>()   // NEW
  const [apiLoading, setApiLoading] = useState(false)                    // NEW
  const [apiError, setApiError] = useState<string>("")                   // NEW

  const options = {
    responsive: true,
    plugins: {
      legend: { position: 'top' as const },
      title: {
        display: true,
        // NEW: show range when we are plotting the city series
        text: range ? `${title}  •  ${range.start} to ${range.end}` : title,
      },
    },
  };

  // Fallback CSV load, runs once
  useEffect(() => {
    if (coords) return  // NEW: skip CSV when we have coords
    Papa.parse('/static/temps.csv', {
      download: true,
      header: true,
      dynamicTyping: true,
      complete: (results) => {
        setCsvData(results.data as ClimateDataRow[]);
        setCsvLoading(false);
      },
      error: (error) => {
        console.error('Error parsing CSV:', error);
        setCsvLoading(false);
      }
    });
  }, [coords]); // CHANGED: depend on coords to skip

  // NEW: localStorage cache key for the given coords
  const cacheKey = useMemo(() => {
    if (!coords) return null
    return `yearly-temp:${coords.lat.toFixed(3)},${coords.long.toFixed(3)}`
  }, [coords])

  // NEW: try read cache first
  useEffect(() => {
    if (!cacheKey) return
    try {
      const raw = localStorage.getItem(cacheKey)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed?.data)) {
          setYearly(parsed.data)
          if (parsed.start && parsed.end) setRange({ start: parsed.start, end: parsed.end })
        }
      }
    } catch {}
  }, [cacheKey])

  // NEW: fetch yearly series from our API when coords change
  useEffect(() => {
    if (!coords) return
    setApiLoading(true)
    setApiError("")
    ;(async () => {
      try {
        const q = new URLSearchParams({
          lat: String(coords.lat),
          long: String(coords.long),
        })
        const res = await fetch(`/api/historical_temp?${q.toString()}`)
        const data = await res.json()
        if (!res.ok || data?.error) {
          setApiError(data?.error || "failed to fetch historical series")
          setYearly([])
          return
        }
        const pts: YearlyPoint[] = Array.isArray(data.data) ? data.data : []
        setYearly(pts)
        if (data.start && data.end) setRange({ start: data.start, end: data.end })
        if (cacheKey) {
          localStorage.setItem(cacheKey, JSON.stringify({
            start: data.start,
            end: data.end,
            coords,
            fetchedAt: new Date().toISOString(),
            data: pts,
          }))
        }
      } catch (e) {
        setApiError("unexpected error loading series")
        setYearly([])
      } finally {
        setApiLoading(false)
      }
    })()
  }, [coords, cacheKey])

  function movingAverage(series: number[], windowSize: number) {
    return series.map((_, idx, arr) => {
      const start = Math.max(0, idx - Math.floor(windowSize / 2));
      const end = Math.min(arr.length, idx + Math.floor(windowSize / 2));
      const subset = arr.slice(start, end + 1);
      return subset.reduce((a, b) => a + b, 0) / subset.length;
    });
  }

  // NEW: choose the source, API city series if coords present, else CSV global series
  const isCityMode = Boolean(coords)  // NEW

  const labels = isCityMode
    ? yearly.map(p => p.year)
    : csvData.map(row => row.Year)

  const mainSeries = isCityMode
    ? yearly.map(p => p.avg)
    : csvData.map(row => row["Annual Average Temperature (F)"])

  const avgSeries = average
    ? movingAverage(mainSeries, 11)
    : []

  return (
    <div>
      {isCityMode ? (
        <>
          {apiLoading && <p>Loading yearly data</p>}
          {!apiLoading && apiError && <p>{apiError}</p>}
          {!apiLoading && !apiError && yearly.length > 0 && (
            <Line
              options={options}
              data={{
                labels,
                datasets: [
                  {
                    label: 'Annual Average Temperature (F)',
                    data: mainSeries,
                    borderColor: 'rgba(229, 62, 62, 1)',
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  },
                  ...(average ? [{
                    label: '11-Year Moving Average',
                    data: avgSeries,
                    borderColor: 'rgba(62, 137, 229, 1)',
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  }] : []),
                ],
              }}
            />
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
                labels,
                datasets: [
                  {
                    label: 'Annual Average Temperature (F)',
                    data: mainSeries,
                    borderColor: 'rgba(229, 62, 62, 1)',
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  },
                  ...(average ? [{
                    label: '11-Year Moving Average',
                    data: avgSeries,
                    borderColor: 'rgba(62, 137, 229, 1)',
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  }] : []),
                ],
              }}
            />
          )}
        </>
      )}
    </div>
  );
};
