"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartData,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Module-level cache
const stormDataCache = new Map<
  string,
  { data: ChartData<"bar"> | null; error: string | null }
>();

interface StormProps {
  location: { lat: number; long: number } | null;
}

export default function Storm({ location }: StormProps) {
  const [chartData, setChartData] = useState<ChartData<"bar"> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const locationKey = useMemo(() => {
    return location ? `${location.lat},${location.long}` : null;
  }, [location]);

  useEffect(() => {
    // Abort controller to cancel fetch if component unmounts or location changes
    const controller = new AbortController();
    const signal = controller.signal;

    if (!locationKey) {
      setChartData(null);
      setError(null);
      return;
    }

    const fetchStormEvents = async () => {
      // 1. Check cache
      if (stormDataCache.has(locationKey)) {
        const cached = stormDataCache.get(locationKey)!;
        setChartData(cached.data);
        setError(cached.error);
        return;
      }

      // 2. Not in cache, fetch new data
      setError(null);
      setLoading(true);
      setChartData(null); // Clear old chart

      // This is the object we'll build *as* the stream comes in
      const countsPerYear: { [year: string]: number } = {};

      try {
        const { lat, long } = location!;
        const res = await fetch(`/api/extreme?lat=${lat}&lon=${long}`, {
          signal, // Pass the signal to the fetch request
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Failed to start data stream");
        }

        if (!res.body) {
          throw new Error("Response body is missing");
        }

        // Set up the stream reader
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break; // Stream finished

          // Add new chunk to buffer and find newlines
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");

          // The last line might be incomplete, so save it for the next chunk
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.trim() === "") continue;
            try {
              const chunk = JSON.parse(line);

              // Check for an error message from the stream
              if (chunk.error) {
                throw new Error(chunk.error);
              }

              // Add the year's data
              if (chunk.year && typeof chunk.count === "number") {
                countsPerYear[chunk.year] = chunk.count;

                // --- THIS IS THE FIX ---
                // Process the data *inside* the loop and update the state
                const years = Object.keys(countsPerYear).sort();
                const counts = years.map((year) => countsPerYear[year]);

                const streamingChartData = {
                  labels: years,
                  datasets: [
                    {
                      label: "Number of Rainy Days",
                      data: counts,
                      backgroundColor: "rgba(75, 192, 192, 0.5)",
                      borderColor: "rgba(75, 192, 192, 1)",
                      borderWidth: 1,
                      fill: true,
                    },
                  ],
                };
                // This updates the chart live as data arrives
                setChartData(streamingChartData);
                // --- END OF FIX ---
              }
            } catch (e) {
              console.error("Failed to parse stream chunk:", line);
            }
          }
        }

        // --- Stream is finished ---

        // Final check for data and caching
        if (Object.keys(countsPerYear).length === 0) {
          throw new Error("No storm data was found for this location.");
        }

        // Re-build the final data one last time to ensure it's complete for the cache
        const years = Object.keys(countsPerYear).sort();
        const counts = years.map((year) => countsPerYear[year]);
        const finalChartData = {
          labels: years,
          datasets: [
            {
              label: "Number of Storm Event Days",
              data: counts,
              backgroundColor: "rgba(75, 192, 192, 0.5)",
              borderColor: "rgba(75, 192, 192, 1)",
              borderWidth: 1,
              fill: true,
            },
          ],
        };

        // Cache the final, successful result
        stormDataCache.set(locationKey, { data: finalChartData, error: null });
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          console.log("Fetch aborted");
          return;
        }
        const errorMessage =
          err instanceof Error ? err.message : "An unknown error occurred.";
        setError(errorMessage);
        // Cache the error
        stormDataCache.set(locationKey, { data: null, error: errorMessage });
      } finally {
        setLoading(false);
      }
    };

    fetchStormEvents();

    // Cleanup function: abort the fetch if the location changes
    return () => {
      controller.abort();
    };
  }, [locationKey, location]);

  const options = {
    responsive: true,
    animation: {
      duration: 200, // Faster animation to feel more responsive during streaming
    },
    plugins: {
      legend: { position: "top" as const },
      title: { display: true, text: "Rainy Days Per Year" },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: "Days with Rain > 1 mm",
        },
      },
      x: {
        title: {
          display: true,
          text: "Year",
        },
      },
    },
  };

  if (!location)
    return (
      <p className="text-center text-gray-500">
        Please select a location to see storm data.
      </p>
    );
  // Show loading *until* the first chunk of data arrives
  if (loading && !chartData)
    return <p className="text-center">Loading storm data...</p>;

  if (error) return <p className="text-center text-red-600">{error}</p>;

  // Show the chart as soon as we have data, even if still "loading" (streaming)
  if (!chartData) return (
    <div className="text-center bg-gray-100 p-4 rounded min-h-[200px]">
    </div>
  );

  return (
    <div className="w-full max-w-4xl p-4 mx-auto">
      <Bar options={options} data={chartData} />
    </div>
  );
}
