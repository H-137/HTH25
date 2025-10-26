'use client'
import { Line } from 'react-chartjs-2'
import { useEffect, useMemo, useState } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Legend,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Legend)

type Coords = { lat: number, long: number }

export default function Graph({ title, average, coords }: { title: string, average: boolean, coords?: Coords }) {
  type YearlyPoint = { year: number, avg: number }

  const [yearly, setYearly] = useState<YearlyPoint[]>([])
  const [range, setRange] = useState<{ start: string, end: string }>()
  const [apiLoading, setApiLoading] = useState(false)
  const [apiError, setApiError] = useState<string>('')

  function formatDate(isoDate: string) {
  const date = new Date(isoDate)
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

  const options = {
    responsive: true,
    plugins: {
      legend: { position: 'top' as const },
      title: {
        display: true,
        text: range ? `${title}  •  ${formatDate(range.start)} to ${formatDate(range.end)}`
        : title,
      },
    },
  }

  // localStorage cache key for the given coords
  const cacheKey = useMemo(() => {
    if (!coords) return null
    return `yearly-temp:${coords.lat.toFixed(3)},${coords.long.toFixed(3)}`
  }, [coords])

  // try read cache first
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

  // fetch yearly series when coords change
  useEffect(() => {
    if (!coords) return
    setApiLoading(true)
    setApiError('')
    ;(async () => {
      try {
        const q = new URLSearchParams({ lat: String(coords.lat), long: String(coords.long) })
        const res = await fetch(`/api/historical_temp?${q.toString()}`)
        const data = await res.json()
        if (!res.ok || data?.error) {
          setApiError(data?.error || 'failed to fetch historical series')
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
      } catch {
        setApiError('unexpected error loading series')
        setYearly([])
      } finally {
        setApiLoading(false)
      }
    })()
  }, [coords, cacheKey])

  function movingAverage(series: number[], windowSize: number) {
    return series.map((_, idx, arr) => {
      const start = Math.max(0, idx - Math.floor(windowSize / 2))
      const end = Math.min(arr.length, idx + Math.floor(windowSize / 2))
      const subset = arr.slice(start, end + 1)
      return subset.reduce((a, b) => a + b, 0) / subset.length
    })
  }

  if (!coords) return <p className="text-sm text-gray-500">Pick a location to see the graph</p>

  const labels = yearly.map(p => p.year)
  const mainSeries = yearly.map(p => p.avg)
  const avgSeries = average ? movingAverage(mainSeries, 11) : []

  return (
    <div>
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
    </div>
  )
}
