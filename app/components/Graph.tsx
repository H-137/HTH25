'use client';

import { Line } from "react-chartjs-2";
import Papa from 'papaparse';
import { useEffect, useState } from "react";

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

export default function Graph({title, average}: {title: string, average: boolean}) {
    type ClimateDataRow = {
        Year: number;
        "Annual Average Temperature (F)": number;
    };

    const [data, setData] = useState<ClimateDataRow[]>([]);
    const [loading, setLoading] = useState(true);

    const options = {
      responsive: true,
      plugins: {
        legend: {
          position: 'top' as const,
        },
        title: {
          display: true,
          text: title,
        },
      },
    };

    useEffect(() => {
      Papa.parse('/static/temps.csv', {
        download: true,
        header: true,
        dynamicTyping: true,
        complete: (results) => {
          setData(results.data as ClimateDataRow[]);
          setLoading(false);
        },
        error: (error) => {
          console.error('Error parsing CSV:', error);
          setLoading(false);
        }
      });
    }, []);

    function movingAverage(data: number[], windowSize: number) {
      return data.map((val, idx, arr) => {
        const start = Math.max(0, idx - Math.floor(windowSize / 2));
        const end = Math.min(arr.length, idx + Math.floor(windowSize / 2));
        const subset = arr.slice(start, end + 1);
        return subset.reduce((a, b) => a + b, 0) / subset.length;
      });
    }

    return (
        <div>
            {loading ? (
                <p>Loading data...</p>
            ) : (
                <Line
                    options={options}
                    data={{
                        labels: data.map((row: ClimateDataRow) => row.Year),
                        datasets: [
                            {
                                label: 'Annual Average Temperature (F)',
                                data: data.map((row: ClimateDataRow) => row['Annual Average Temperature (F)']),
                                borderColor: 'rgba(229, 62, 62, 1)',
                                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                            },
                            ...(average ? [{
                                label: '11-Year Moving Average',
                                data: movingAverage(data.map((row: ClimateDataRow) => row['Annual Average Temperature (F)']), 11),
                                borderColor: 'rgba(62, 137, 229, 1)',
                                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                            }] : []),
                        ],
                    }}
                />
            )}
        </div>
    );
};
