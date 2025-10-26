// app/api/historical_temp/route.js
import { NextResponse } from "next/server"

// helper, Open-Meteo has a 5-day delay on historical updates
function fullRange() {
  const start = "1940-01-01"
  const end = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)
  return { start, end }
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const lat = parseFloat(searchParams.get("lat"))
    const long = parseFloat(searchParams.get("long"))
    if (!Number.isFinite(lat) || !Number.isFinite(long)) {
      return NextResponse.json({ error: "lat and long are required" }, { status: 400 })
    }

    const { start, end } = fullRange()

    const url = new URL("https://archive-api.open-meteo.com/v1/archive")
    url.searchParams.set("latitude", String(lat))
    url.searchParams.set("longitude", String(long))
    url.searchParams.set("start_date", start)
    url.searchParams.set("end_date", end)
    url.searchParams.set("daily", "temperature_2m_mean")     // daily mean temperature
    url.searchParams.set("temperature_unit", "fahrenheit")    // your chart is in °F
    url.searchParams.set("timezone", "auto")

    const res = await fetch(url.toString(), { next: { revalidate: 60 * 60 * 24 } }) // cache on the server for a day
    const data = await res.json()

    if (!res.ok || data?.error) {
      const reason = data?.reason || "archive API error"
      return NextResponse.json({ error: reason }, { status: 502 })
    }

    const temps = data?.daily?.temperature_2m_mean
    const dates = data?.daily?.time
    if (!Array.isArray(temps) || !Array.isArray(dates)) {
      return NextResponse.json({ error: "no daily series returned" }, { status: 404 })
    }

    // build yearly averages with 1-decimal rounding
    const buckets = {}
    for (let i = 0; i < dates.length; i++) {
      const y = dates[i].slice(0, 4)
      const t = temps[i]
      if (typeof t === "number") {
        if (!buckets[y]) buckets[y] = []
        buckets[y].push(t)
      }
    }

    const yearly = Object.entries(buckets)
      .map(([year, arr]) => ({
        year: Number(year),
        avg: Number((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1)),
      }))
      .sort((a, b) => a.year - b.year)

    return NextResponse.json({
      start,
      end,
      lat,
      long,
      data: yearly,
    })
  } catch (err) {
    console.error("historical_temp route failed", err)
    return NextResponse.json({ error: "unexpected server error" }, { status: 500 })
  }
}
