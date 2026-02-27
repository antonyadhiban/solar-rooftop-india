/**
 * API utilities for fetching external data
 */

import type { Feature, Polygon } from "geojson";

// Multiple Overpass API endpoints for fallback resilience
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];

/**
 * Fetch building footprints from OSM Overpass API with multi-endpoint fallback
 */
export async function fetchBuildingFootprints(
  lat: number,
  lon: number,
  radius: number = 50
): Promise<Feature<Polygon>[]> {
  const query = `
    [out:json][timeout:25];
    (
      way["building"](around:${radius},${lat},${lon});
      relation["building"](around:${radius},${lat},${lon});
    );
    out body;
    >;
    out skel qt;
  `;

  let lastError: Error = new Error("All Overpass endpoints failed");

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(endpoint, {
        method: "POST",
        body: `data=${encodeURIComponent(query)}`,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        lastError = new Error(`Overpass API error: ${response.status}`);
        continue;
      }

      const text = await response.text();

      // Check if response is an HTML error page instead of JSON
      if (text.trim().startsWith("<")) {
        lastError = new Error("Overpass endpoint returned error page");
        continue;
      }

      const data = JSON.parse(text);
      return osmToGeoJSON(data);
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      continue;
    }
  }

  throw lastError;
}

/**
 * Convert OSM Overpass response to GeoJSON features
 */
function osmToGeoJSON(osmData: {
  elements: Array<{
    type: string;
    id: number;
    lat?: number;
    lon?: number;
    nodes?: number[];
    tags?: Record<string, string>;
  }>;
}): Feature<Polygon>[] {
  const nodes = new Map<number, [number, number]>();
  const ways: Array<{
    id: number;
    nodes: number[];
    tags?: Record<string, string>;
  }> = [];

  for (const el of osmData.elements) {
    if (el.type === "node" && el.lat !== undefined && el.lon !== undefined) {
      nodes.set(el.id, [el.lon, el.lat]);
    } else if (el.type === "way" && el.nodes) {
      ways.push({ id: el.id, nodes: el.nodes, tags: el.tags });
    }
  }

  const features: Feature<Polygon>[] = [];

  for (const way of ways) {
    const coordinates: [number, number][] = [];
    let valid = true;

    for (const nodeId of way.nodes) {
      const coord = nodes.get(nodeId);
      if (coord) {
        coordinates.push(coord);
      } else {
        valid = false;
        break;
      }
    }

    if (valid && coordinates.length >= 4) {
      features.push({
        type: "Feature",
        properties: {
          id: way.id,
          ...way.tags,
        },
        geometry: {
          type: "Polygon",
          coordinates: [coordinates],
        },
      });
    }
  }

  return features;
}

/**
 * Fetch solar irradiance data from NASA POWER API
 */
export async function fetchSolarIrradiance(
  lat: number,
  lon: number
): Promise<{ monthlyGHI: Record<string, number>; annualAvgGHI: number }> {
  const url = `https://power.larc.nasa.gov/api/temporal/monthly/point?parameters=ALLSKY_SFC_SW_DWN&community=RE&longitude=${lon}&latitude=${lat}&start=2021&end=2023&format=JSON`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`NASA POWER API error: ${response.status}`);
  }

  const data = await response.json();
  const monthlyData = data.properties?.parameter?.ALLSKY_SFC_SW_DWN;

  if (!monthlyData) {
    throw new Error("No irradiance data found");
  }

  // monthlyData has keys like "202101", "202102", etc. with values in kWh/m²/day
  const values = Object.values(monthlyData).filter(
    (v): v is number => typeof v === "number" && v !== -999
  );

  const annualAvgGHI = values.length > 0
    ? values.reduce((sum, v) => sum + v, 0) / values.length
    : 4.5; // Fallback for India average

  // Build a monthly average (Jan-Dec)
  const monthlyAvg: Record<string, number> = {};
  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];

  for (let m = 1; m <= 12; m++) {
    const monthStr = m.toString().padStart(2, "0");
    const monthValues: number[] = [];
    for (const key of Object.keys(monthlyData)) {
      if (key.endsWith(monthStr) && monthlyData[key] !== -999) {
        monthValues.push(monthlyData[key]);
      }
    }
    monthlyAvg[monthNames[m - 1]] =
      monthValues.length > 0
        ? monthValues.reduce((s, v) => s + v, 0) / monthValues.length
        : annualAvgGHI;
  }

  return { monthlyGHI: monthlyAvg, annualAvgGHI };
}

/**
 * Geocode an address using Nominatim
 */
export async function geocodeAddress(
  query: string
): Promise<{ lat: number; lon: number; displayName: string } | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
    query
  )}&countrycodes=in&limit=5`;

  const response = await fetch(url, {
    headers: {
      "User-Agent": "SolarRooftopIndia/1.0",
    },
  });

  if (!response.ok) return null;

  const results = await response.json();
  if (results.length === 0) return null;

  return {
    lat: parseFloat(results[0].lat),
    lon: parseFloat(results[0].lon),
    displayName: results[0].display_name,
  };
}
