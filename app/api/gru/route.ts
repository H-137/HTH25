import { NextResponse } from "next/server";

// This is the URL where your Python FastAPI server is running
// Make sure this is correct.
const PYTHON_API_BASE_URL = "http://127.0.0.1:8000";

/**
 * This API route acts as a proxy to your Python ML server.
 * It intelligently decides which endpoint to hit based on the payload.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    let endpoint = "";

    // Decide which Python endpoint to hit based on the request body
    if (
      body.lat &&
      body.lon &&
      body.historical_years &&
      body.historical_temps
    ) {
      // If full data is provided, use the 'manual' endpoint
      endpoint = "/predict/manual";
    } else if (body.city && body.state) {
      // If only city/state is provided, use the 'automatic' endpoint
      endpoint = "/predict/automatic";
    } else {
      // If the body is invalid
      return NextResponse.json(
        {
          error:
            "Invalid request body. Must provide either {city, state} or {city, state, lat, lon, historical_years, historical_temps}",
        },
        { status: 400 }
      );
    }

    const pythonApiUrl = `${PYTHON_API_BASE_URL}${endpoint}`;
    console.log(`Forwarding request to: ${pythonApiUrl}`);

    // Call (fetch) the Python API
    const apiResponse = await fetch(pythonApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    // Get the response data from the Python API
    const data = await apiResponse.json();

    if (!apiResponse.ok) {
      // If the Python API returned an error, forward it
      console.error("Error from Python API:", data);
      return NextResponse.json(
        { error: data.detail || "An error occurred from the Python API" },
        { status: apiResponse.status }
      );
    }

    // Send the successful prediction data back to the Next.js client
    return NextResponse.json(data);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("--- Error in Next.js API route ---");
    console.error(error);

    // Handle cases where the fetch itself fails
    // This *usually* means the Python server is not running.
    if (error.code === "ECONNREFUSED") {
      return NextResponse.json(
        {
          error:
            "Could not connect to the Python ML server. Is it running at http://127.0.0.1:8000?",
        },
        { status: 503 } // 503 Service Unavailable
      );
    }

    // Generic internal server error
    return NextResponse.json(
      { error: "An internal server error occurred", details: error.message },
      { status: 500 }
    );
  }
}
