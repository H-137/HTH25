import { NextResponse } from "next/server"

// create url obj, if city is empty, fail
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const city = searchParams.get("city")
    const stateInit = searchParams.get("state")
    if (!city) {
      return NextResponse.json({ error: "city is required" }, { status: 400 })
    }

    // geocoding api call
    const base = "https://geocoding-api.open-meteo.com/v1/search"
    const params = new URLSearchParams({
      name: city,
      count: "90",
      countryCode: "US"
    })
    const url = `${base}?${params.toString()}`

    // get the response obj
    const res = await fetch(url)
    if (!res.ok) {
      return NextResponse.json(
        { error: "geocoding error" },
        { status: res.status }
      )
    }
    
    // init data to  the json of response and make it a list
    const data = await res.json()
    const list = Array.isArray(data.results) ? data.results : []

    if (!list.length) {
      return NextResponse.json({ error: "no results found" }, { status: 404 })
    }

    const US_STATE_BY_ABBR = { 
      AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
      CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
      HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
      KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
      MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri",
      MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
      NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio",
      OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
      SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont",
      VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
      DC: "District of Columbia",
    }

    let chosen = list[0] || null
    let matched = false

    // match user_input 'State' to the 'Admin 1' response of the api call
    if (stateInit && US_STATE_BY_ABBR[stateInit.toUpperCase()]) {
      const full = US_STATE_BY_ABBR[stateInit.toUpperCase()]
      const exact = list.find(
        (result) =>
          result &&
          result.country_code === "US" &&
          typeof result.admin1 === "string" &&
          result.admin1.toLowerCase() === full.toLowerCase()
      )
      // if exact match is found yay ... else matched = false
      if (exact) {
        chosen = exact
        matched = true
      } else {
        const usFirst = list.find((result) => result && result.country_code === "US")
        if (usFirst) chosen = usFirst
      }
    }

    if (!chosen) {
      return NextResponse.json({ error: "no results found" }, { status: 404 })
    }

    // builds the data that will be sent to the client -> Search.tsx
    const payload = {
      lat: chosen.latitude,
      long: chosen.longitude,
      resolved: [chosen.name, chosen.admin1, chosen.country].filter(Boolean).join(", "),
      isClosestMatch: !matched,
      name: chosen.name,
      admin1: chosen.admin1,
    }

    return NextResponse.json(payload, { status: 200 })
  } catch (err) {
    console.error("Server error:", err)
    return NextResponse.json({ error: "unexpected server error" }, { status: 500 })
  }
}
