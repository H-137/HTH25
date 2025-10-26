import { NextRequest } from "next/server";

const NOAA_API_TOKEN = process.env.NOAA_API_TOKEN || "YOUR_NOAA_API_TOKEN";
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper function to send JSON data over the stream
function sendJSON(controller: ReadableStreamDefaultController, data: object) {
  const encoder = new TextEncoder();
  controller.enqueue(encoder.encode(JSON.stringify(data) + "\n"));
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");

  if (!lat || !lon) {
    return new Response(
      JSON.stringify({
        error: "Latitude and longitude query parameters are required.",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // 1. Get FIPS code from FCC API
        const fccRes = await fetch(
          `https://geo.fcc.gov/api/census/block/find?latitude=${lat}&longitude=${lon}&format=json`
        );
        if (!fccRes.ok) throw new Error("Failed to fetch location data");
        const fccData = await fccRes.json();
        const fipsCode = fccData?.County?.FIPS;

        if (!fipsCode) {
          throw new Error("Could not find a valid county for this location.");
        }

        // 2. Loop through years and stream data
        const endYear = new Date().getFullYear() - 1;
        const startYear = endYear - 25; // 25-year lookback
        const dataType = "PRCP"; // Switched to Precipitation

        for (let year = startYear; year <= endYear; year++) {
          const dateSet = new Set<string>();
          let totalFetched = 0;
          let totalToFetch = 0;
          let offset = 1;
          const limit = 1000; // Max limit per request

          const noaaUrl = new URL(
            "https://www.ncei.noaa.gov/cdo-web/api/v2/data"
          );
          noaaUrl.searchParams.set("datasetid", "GHCND");
          noaaUrl.searchParams.set("locationid", `FIPS:${fipsCode}`);
          noaaUrl.searchParams.set("startdate", `${year}-01-01`);
          noaaUrl.searchParams.set("enddate", `${year}-12-31`);
          noaaUrl.searchParams.set("datatypeid", dataType); // Use PRCP
          noaaUrl.searchParams.set("units", "standard");
          noaaUrl.searchParams.set("limit", limit.toString());

          // 3. Inner pagination loop to get all records for the year
          do {
            noaaUrl.searchParams.set("offset", offset.toString());

            const noaaRes = await fetch(noaaUrl.toString(), {
              headers: { token: NOAA_API_TOKEN },
            });

            if (!noaaRes.ok) {
              console.error(
                `NOAA API error for ${year}: ${noaaRes.statusText}`
              );
              break; // Stop trying for this year
            }

            const noaaData = await noaaRes.json();
            const results = noaaData?.results || [];

            if (offset === 1) {
              totalToFetch = noaaData?.metadata?.resultset?.count || 0;
            }

            if (results.length === 0) {
              break; // No more data
            }

            // Add dates to the Set to de-duplicate
            // Only count days where precipitation was greater than 1 mm
            for (const item of results) {
              if (item.value > 1) {
                dateSet.add(item.date);
              }
            }

            totalFetched += results.length;
            offset += limit;
          } while (totalFetched < totalToFetch);

          // 4. Send the *unique* count for this year
          sendJSON(controller, { year: year.toString(), count: dateSet.size });

          // IMPORTANT: Wait 200ms to avoid rate limiting
          await delay(200);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "An unknown error occurred.";
        sendJSON(controller, { error: errorMessage });
      } finally {
        // Close the stream
        controller.close();
      }
    },
  });

  // Return the stream
  return new Response(stream, {
    headers: {
      "Content-Type": "application/octet-stream; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
