"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import area from "@turf/area";
import { polygon } from "@turf/helpers";
import type { Feature, Polygon } from "geojson";
import { SQFT_PER_SQ_M } from "@/lib/calculations";

export type RoofPolygon = number[][];

interface RoofDrawingToolProps {
  building: Feature<Polygon>;
  roofPolygon: RoofPolygon | null;
  onRoofChange: (polygon: RoofPolygon | null) => void;
  areaUnit?: "m2" | "sqft";
}

// Project polygon to 2D screen coords for editing (bounding box)
function getBoundingBox(coords: number[][]): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const c of coords) {
    const x = c[0];
    const y = c[1];
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  return { minX, minY, maxX, maxY };
}

function toScreen(
  coords: number[][],
  width: number,
  height: number,
  padding: number
): { points: { x: number; y: number }[]; scale: number; offsetX: number; offsetY: number } {
  const bbox = getBoundingBox(coords);
  const rangeX = bbox.maxX - bbox.minX || 1;
  const rangeY = bbox.maxY - bbox.minY || 1;
  const scale = Math.min(
    (width - padding * 2) / rangeX,
    (height - padding * 2) / rangeY
  );
  const offsetX = padding - bbox.minX * scale;
  const offsetY = height - padding - bbox.maxY * scale;

  const points = coords.map((c) => ({
    x: c[0] * scale + offsetX,
    y: height - (c[1] * scale + offsetY),
  }));
  return { points, scale, offsetX, offsetY };
}

function findNearestEdge(
  points: { x: number; y: number }[],
  px: number,
  py: number
): { index: number; dist: number } | null {
  if (points.length < 2) return null;
  let best = { index: 0, dist: Infinity };
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    const ax = points[i].x;
    const ay = points[i].y;
    const bx = points[j].x;
    const by = points[j].y;
    const t = Math.max(
      0,
      Math.min(
        1,
        ((px - ax) * (bx - ax) + (py - ay) * (by - ay)) /
          ((bx - ax) ** 2 + (by - ay) ** 2 || 1)
      )
    );
    const projX = ax + t * (bx - ax);
    const projY = ay + t * (by - ay);
    const dist = Math.hypot(px - projX, py - projY);
    if (dist < best.dist) best = { index: j, dist };
  }
  return best.dist < 20 ? best : null;
}

function findNearestVertex(
  points: { x: number; y: number }[],
  px: number,
  py: number,
  threshold: number
): number | null {
  let best = -1;
  let bestDist = threshold;
  for (let i = 0; i < points.length; i++) {
    const d = Math.hypot(px - points[i].x, py - points[i].y);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best >= 0 ? best : null;
}

export default function RoofDrawingTool({
  building,
  roofPolygon,
  onRoofChange,
  areaUnit = "m2",
}: RoofDrawingToolProps) {
  const coords = roofPolygon ?? building.geometry.coordinates[0];
  const [dragging, setDragging] = useState<number | null>(null);
  const [size, setSize] = useState({ width: 400, height: 300 });
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const roofAreaSqM = useMemo(() => {
    const poly = polygon([coords]);
    return area(poly);
  }, [coords]);

  const { points, scale, offsetX, offsetY } = useMemo(
    () => toScreen(coords, size.width, size.height, 40),
    [coords, size.width, size.height]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, size.width, size.height);
    ctx.fillStyle = "rgba(251, 191, 36, 0.3)";
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 2;
    ctx.beginPath();
    points.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    points.forEach((p, i) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = i === dragging ? "#ea580c" : "#f97316";
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  }, [points, dragging, size.width, size.height]);

  const handleCanvasRef = useCallback(
    (el: HTMLDivElement | null) => {
      if (!el) return;
      const ro = new ResizeObserver((entries) => {
        const { width, height } = entries[0].contentRect;
        setSize({ width, height });
      });
      ro.observe(el);
      return () => ro.disconnect();
    },
    []
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;

      if (e.button === 2) {
        e.preventDefault();
        const vi = findNearestVertex(points, px, py, 15);
        if (vi !== null && points.length > 3) {
          const newCoords = coords.filter((_, i) => i !== vi);
          onRoofChange(newCoords);
        }
        return;
      }

      const vi = findNearestVertex(points, px, py, 12);
      if (vi !== null) {
        setDragging(vi);
        return;
      }

      const edge = findNearestEdge(points, px, py);
      if (edge !== null) {
        const newCoords = [...coords];
        const mid = [
          (coords[edge.index][0] + coords[(edge.index - 1 + coords.length) % coords.length][0]) / 2,
          (coords[edge.index][1] + coords[(edge.index - 1 + coords.length) % coords.length][1]) / 2,
        ];
        newCoords.splice(edge.index, 0, mid);
        onRoofChange(newCoords);
      }
    },
    [points, coords, onRoofChange]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (dragging === null) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;

      const screenToGeo = (sx: number, sy: number) => {
        const x = (sx - offsetX) / scale;
        const y = (size.height - sy - offsetY) / scale;
        return [x, y];
      };

      const [gx, gy] = screenToGeo(px, py);
      const newCoords = coords.map((c, i) =>
        i === dragging ? [gx, gy] : c
      );
      onRoofChange(newCoords);
    },
    [dragging, coords, onRoofChange, offsetX, offsetY, scale, size.height]
  );

  const handleMouseUp = useCallback(() => setDragging(null), []);
  const handleMouseLeave = useCallback(() => setDragging(null), []);

  const handleReset = useCallback(() => {
    onRoofChange(null);
  }, [onRoofChange]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Edit Roof Area</h3>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-600">
            {areaUnit === "m2"
              ? `${Math.round(roofAreaSqM)} m²`
              : `${Math.round(roofAreaSqM * SQFT_PER_SQ_M)} sq ft`}
          </span>
          <button
            type="button"
            onClick={handleReset}
            className="rounded-lg border border-gray-200 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
          >
            Reset
          </button>
        </div>
      </div>
      <p className="text-xs text-gray-500">
        Drag vertices to adjust. Click near an edge to add a vertex. Right-click a vertex to remove.
      </p>
      <div
        ref={handleCanvasRef}
        className="relative overflow-hidden rounded-lg border border-gray-200 bg-gray-50"
        style={{ height: 280 }}
      >
        <canvas
          ref={canvasRef}
          width={size.width}
          height={size.height}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onContextMenu={(e) => e.preventDefault()}
          className="cursor-crosshair"
          style={{ width: "100%", height: "100%" }}
        />
      </div>
    </div>
  );
}
