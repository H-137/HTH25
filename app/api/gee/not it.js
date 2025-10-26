import { NextResponse } from "next/server";
import ee from "@google/earthengine";

const serviceAccount = JSON.parse(process.env.EE_SERVICE_ACCOUNT_KEY);
let initialized = false;

async function initEE() {
  if (initialized) return;

  await new Promise((resolve, reject) => {
    ee.data.authenticateViaPrivateKey(
      serviceAccount,
      () => {
        ee.initialize(null, null, resolve, reject);
      },
      (err) => reject(err)
    );
  });

  initialized = true;
}

export async function GET() {
  try {
    await initEE();

    const lat = 42.3601;
    const lon = -71.0589;

    const image = ee
      .ImageCollection("COPERNICUS/S2_SR")
      .filterBounds(ee.Geometry.Point([lon, lat]))
      .filterDate("2024-06-01", "2024-06-10")
      .sort("CLOUD_COVER")
      .first()
      .select(["B4", "B3", "B2"]);

    const visParams = {
      min: 0,
      max: 3000,
      gamma: 1.2,
    };

    const region = ee.Geometry.Point([lon, lat]).buffer(5000).bounds();
    const url = image.getThumbURL({
      region,
      scale: 30,
      format: "png",
      ...visParams,
    });
    console.log("Thumbnail URL:", url);

    return NextResponse.json({ thumbnail: url });
  } catch (err) {
    console.error("Error initializing EE:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
