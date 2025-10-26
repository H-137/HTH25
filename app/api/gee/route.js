import ee from '@google/earthengine';
import { GoogleAuth } from 'google-auth-library';
import { getEECredentials } from '../../utils/credentials';
import { NextResponse } from 'next/server';

let initialized = false;

export async function initEE() {
  if (initialized) return;

  const serviceAccount = getEECredentials();
  if (!serviceAccount) throw new Error('EE credentials not found');

  const auth = new GoogleAuth({
    credentials: serviceAccount,
    scopes: ['https://www.googleapis.com/auth/earthengine'],
  });

  await new Promise((resolve, reject) => {
    ee.data.authenticateViaPrivateKey(
      serviceAccount,
      () => {
        ee.initialize(null, null, () => {
          initialized = true;
          resolve();
        }, reject);
      },
      reject
    );
  });
}


export async function GET(req) {
  try {
    await initEE();
    const { searchParams } = new URL(req.url);
    const lat = parseFloat(searchParams.get('lat'));
    const lon = parseFloat(searchParams.get('lng'));
    const mode = searchParams.get('mode');
    const tsParam = searchParams.get('ts');

    if (isNaN(lat) || isNaN(lon)) {
      return NextResponse.json({ error: 'Invalid lat/lng' }, { status: 400 });
    }

    const region = ee.Geometry.Point([lon, lat]).buffer(5000);
    const regionArea = ee.Number(region.area());

    // Base collection
    let l5 = ee.ImageCollection('LANDSAT/LT05/C02/T1_L2')
  .filterBounds(region)
  .filter(ee.Filter.calendarRange(171, 242, 'day_of_year'))
  .filter(ee.Filter.lt('CLOUD_COVER', 5))
  .select(['SR_B3', 'SR_B2', 'SR_B1']); // Already in L5 bands

let l8 = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
  .filterBounds(region)
  .filter(ee.Filter.calendarRange(171, 242, 'day_of_year'))
  .filter(ee.Filter.lt('CLOUD_COVER', 5))
  .select(['SR_B4', 'SR_B3', 'SR_B2']) // L8: Red, Green, Blue
  .map(img => img.rename(['SR_B3', 'SR_B2', 'SR_B1'])); // Normalize to L5 bands

// Merge collections
let images = l5.merge(l8);

    // Annotate with coverage
    images = images.map(img => {
      const testBand = img.select('SR_B3');
      const validPixelArea = ee.Image.pixelArea().updateMask(testBand.mask());
      const unmaskedArea = validPixelArea.reduceRegion({
        reducer: ee.Reducer.sum(),
        geometry: region,
        scale: 30,
        maxPixels: 1e13
      }).get('area');
      const coverage = ee.Number(unmaskedArea).divide(regionArea);
      const date = ee.Date(img.get('system:time_start'));
      return img.set({
        'coverage': coverage,
        'year': date.get('year'),
        'time_start': img.get('system:time_start')
      });
    });

    images = images.filter(ee.Filter.gte('coverage', 0.999)).sort('time_start');


    if (mode === 'meta') {
      const timestamps = await images.aggregate_array('system:time_start').getInfo();
      const seenYears = new Set();
      const filtered = timestamps.filter(ts => {
        const year = new Date(ts).getUTCFullYear();
        if (seenYears.has(year)) return false;
        seenYears.add(year);
        return true;
      });
      const years = filtered.map(ts => new Date(ts).getUTCFullYear());
      return NextResponse.json({ timestamps: filtered, years }, { status: 200 });
    }

    if (tsParam) {
      const ts = parseInt(tsParam);
      const l5 = ee.ImageCollection('LANDSAT/LT05/C02/T1_L2')
        .filter(ee.Filter.eq('system:time_start', ts))
        .select(['SR_B3', 'SR_B2', 'SR_B1']);

      const l8 = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
        .filter(ee.Filter.eq('system:time_start', ts))
        .select(['SR_B4', 'SR_B3', 'SR_B2'])
        .map(img => img.rename(['SR_B3', 'SR_B2', 'SR_B1'])); // Normalize to L5 bands

      const img = ee.Image(l5.merge(l8).first());
      const date = new Date(ts);
      const year = date.getUTCFullYear();

  const stats = img.select(['SR_B3','SR_B2','SR_B1'])
  .reduceRegion({
    reducer: ee.Reducer.percentile([2, 98]),
    geometry: region,
    scale: 30,
    maxPixels: 1e9
  });

  const minVals = [
    stats.getNumber('SR_B3_p2'),
    stats.getNumber('SR_B2_p2'),
    stats.getNumber('SR_B1_p2')
  ];

  const maxVals = [
    stats.getNumber('SR_B3_p98'),
    stats.getNumber('SR_B2_p98'),
    stats.getNumber('SR_B1_p98')
  ];


  const scaled = img.select(['SR_B3','SR_B2','SR_B1'])
    .subtract(ee.Image.constant(minVals))
    .divide(ee.Image.constant(maxVals).subtract(ee.Image.constant(minVals)))
    .multiply(255)
    .clamp(0, 255)
    .toUint8(); // integer 0–255

  const thumb = await scaled.getDownloadURL({
    region: region,
    scale: 30,
    format: 'png'
  });
      return NextResponse.json({ ts, year, url: thumb }, { status: 200 });
    }

    return NextResponse.json({ error: 'Missing mode or ts parameter' }, { status: 400 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
