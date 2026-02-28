"use client";

import { useEffect, useMemo, useState } from "react";
import { getSunPosition, sunPositionToDirection } from "@/lib/shading";

interface ShadingSimulatorProps {
  lat: number;
  lon: number;
  onShadingFactorChange?: (factor: number) => void;
}

export default function ShadingSimulator({
  lat,
  lon,
  onShadingFactorChange,
}: ShadingSimulatorProps) {
  const [date, setDate] = useState(() => {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    return d.toISOString().slice(0, 10);
  });
  const [hour, setHour] = useState(12);

  const dateTime = useMemo(() => {
    const d = new Date(date);
    d.setHours(hour, 0, 0, 0);
    return d;
  }, [date, hour]);

  const sunPos = useMemo(
    () => getSunPosition(dateTime, lat, lon),
    [dateTime, lat, lon]
  );

  const direction = useMemo(
    () => sunPositionToDirection(sunPos.altitude, sunPos.azimuth),
    [sunPos]
  );

  const altitudeDeg = (sunPos.altitude * 180) / Math.PI;
  const azimuthDeg = ((sunPos.azimuth * 180) / Math.PI + 180) % 360;

  const isAboveHorizon = sunPos.altitude > 0;
  const shadingFactor = useMemo(() => {
    if (!isAboveHorizon) return 0.3;
    const factor = Math.max(0, 0.2 - (altitudeDeg / 90) * 0.2);
    return factor;
  }, [isAboveHorizon, altitudeDeg]);

  const effectivePR = useMemo(
    () => Math.max(0.5, 0.75 * (1 - shadingFactor)),
    [shadingFactor]
  );

  useEffect(() => {
    onShadingFactorChange?.(shadingFactor);
  }, [shadingFactor, onShadingFactorChange]);

  return (
    <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4">
      <h3 className="font-semibold text-gray-900">Shading Simulation</h3>
      <p className="text-xs text-gray-500">
        Adjust date and time to see sun position. Shading affects system performance.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Date
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-accent-blue-400"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Hour (24h)
          </label>
          <input
            type="range"
            min={0}
            max={23}
            value={hour}
            onChange={(e) => setHour(Number(e.target.value))}
            className="w-full accent-indigo-500"
          />
          <div className="mt-1 text-sm text-gray-600">{hour}:00</div>
        </div>
      </div>

      <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-gray-500">Altitude</span>
            <div className="font-medium">
              {isAboveHorizon ? `${altitudeDeg.toFixed(1)}°` : "Below horizon"}
            </div>
          </div>
          <div>
            <span className="text-gray-500">Azimuth</span>
            <div className="font-medium">{azimuthDeg.toFixed(1)}°</div>
          </div>
          <div>
            <span className="text-gray-500">Est. shading factor</span>
            <div className="font-medium">{(shadingFactor * 100).toFixed(0)}%</div>
          </div>
          <div>
            <span className="text-gray-500">Effective PR</span>
            <div className="font-medium">{(effectivePR * 100).toFixed(0)}%</div>
          </div>
        </div>
      </div>

      <div className="h-32 rounded-lg border border-gray-200 bg-sky-100 p-4">
        <div className="relative h-full w-full">
          <div
            className="absolute h-4 w-4 rounded-full bg-amber-400 shadow-lg"
            style={{
              left: `${50 + direction.x * 40}%`,
              top: `${50 - direction.y * 40}%`,
              opacity: isAboveHorizon ? 1 : 0.3,
            }}
            title="Sun position"
          />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gray-400" />
        </div>
      </div>
    </div>
  );
}
