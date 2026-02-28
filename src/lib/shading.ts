/**
 * Shading analysis using SunCalc for sun position
 */

import SunCalc from "suncalc";

export interface SunPosition {
  altitude: number;
  azimuth: number;
}

/**
 * Get sun position (altitude and azimuth in radians) at a given date/time and location
 */
export function getSunPosition(
  date: Date,
  lat: number,
  lon: number
): SunPosition {
  const pos = SunCalc.getPosition(date, lat, lon);
  return {
    altitude: pos.altitude,
    azimuth: pos.azimuth,
  };
}

/**
 * Convert sun position to a direction vector (for raycasting)
 * Altitude: angle above horizon (0 = horizon, PI/2 = zenith)
 * Azimuth: angle from north, clockwise (0 = north, PI/2 = east)
 * Returns unit vector pointing toward the sun
 */
export function sunPositionToDirection(altitude: number, azimuth: number): {
  x: number;
  y: number;
  z: number;
} {
  const cosAlt = Math.cos(altitude);
  const sinAlt = Math.sin(altitude);
  const cosAzi = Math.cos(azimuth);
  const sinAzi = Math.sin(azimuth);
  return {
    x: sinAlt * sinAzi,
    y: cosAlt,
    z: sinAlt * cosAzi,
  };
}

/**
 * Estimate shading factor (0-1) based on sun path over a typical day
 * Uses hourly samples and assumes obstructions reduce output proportionally
 * Simplified: returns 0 for no shading, higher values for more shading
 */
export function estimateShadingFactor(
  lat: number,
  lon: number,
  date: Date,
  _obstructionHeights?: number[]
): number {
  const hours: number[] = [];
  for (let h = 6; h <= 18; h++) {
    const d = new Date(date);
    d.setHours(h, 30, 0, 0);
    const pos = getSunPosition(d, lat, lon);
    if (pos.altitude > 0) {
      hours.push(pos.altitude);
    }
  }
  if (hours.length === 0) return 0.5;
  const avgAltitude = hours.reduce((a, b) => a + b, 0) / hours.length;
  const maxAltitude = Math.max(...hours);
  return Math.max(0, 1 - avgAltitude / (Math.PI / 4));
}
