"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { Feature, Polygon } from "geojson";
import centroid from "@turf/centroid";
import { polygon } from "@turf/helpers";

export const PANEL_WIDTH_M = 2;
export const PANEL_HEIGHT_M = 1;
export const PANEL_WATTS = 400;

export interface PlacedPanel {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

interface PanelPlacementToolProps {
  building: Feature<Polygon>;
  roofPolygon: number[][] | null;
  panels: PlacedPanel[];
  onPanelsChange: (panels: PlacedPanel[]) => void;
}

const METERS_PER_DEG_LAT = 110540;
const METERS_PER_DEG_LON = (lat: number) => 111320 * Math.cos((lat * Math.PI) / 180);

function getRoofBounds(coords: number[][], centerLon: number, centerLat: number) {
  const metersPerLon = METERS_PER_DEG_LON(centerLat);
  const metersPerLat = METERS_PER_DEG_LAT;
  const toLocal = (lon: number, lat: number) => ({
    x: (lon - centerLon) * metersPerLon,
    y: (lat - centerLat) * metersPerLat,
  });
  return coords.map((c) => toLocal(c[0], c[1]));
}

function isPointInPolygon(
  px: number,
  py: number,
  vertices: { x: number; y: number }[]
): boolean {
  let inside = false;
  const n = vertices.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = vertices[i].x,
      yi = vertices[i].y;
    const xj = vertices[j].x,
      yj = vertices[j].y;
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function snapToGrid(val: number, grid: number): number {
  return Math.round(val / grid) * grid;
}

export default function PanelPlacementTool({
  building,
  roofPolygon,
  panels,
  onPanelsChange,
}: PanelPlacementToolProps) {
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<{ panelX: number; panelY: number; mouseX: number; mouseY: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const coords = roofPolygon ?? building.geometry.coordinates[0];
  const cent = centroid(building);
  const [centerLon, centerLat] = cent.geometry.coordinates;

  const roofLocal = useMemo(
    () => getRoofBounds(coords, centerLon, centerLat),
    [coords, centerLon, centerLat]
  );

  const totalCapacityKW = useMemo(
    () => (panels.length * PANEL_WATTS) / 1000,
    [panels.length]
  );

  const handleAddPanel = useCallback(() => {
    const closedCoords = coords.length > 0 && (coords[0][0] !== coords[coords.length - 1][0] || coords[0][1] !== coords[coords.length - 1][1])
      ? [...coords, coords[0]]
      : coords;
    const roofPoly = polygon([closedCoords]);
    const center = centroid(roofPoly);
    const [lon, lat] = center.geometry.coordinates;
    const metersPerLon = METERS_PER_DEG_LON(centerLat);
    const metersPerLat = METERS_PER_DEG_LAT;
    const x = (lon - centerLon) * metersPerLon;
    const y = (lat - centerLat) * metersPerLat;

    const newPanel: PlacedPanel = {
      id: `panel-${Date.now()}`,
      x: snapToGrid(x, 0.5),
      y: snapToGrid(y, 0.5),
      width: PANEL_WIDTH_M,
      height: PANEL_HEIGHT_M,
      rotation: 0,
    };

    if (isPointInPolygon(newPanel.x, newPanel.y, roofLocal)) {
      onPanelsChange([...panels, newPanel]);
    }
  }, [coords, centerLon, centerLat, roofLocal, panels, onPanelsChange]);

  const roofBounds = useMemo(() => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of roofLocal) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
    const rangeX = maxX - minX || 10;
    const rangeY = maxY - minY || 10;
    return { minX, minY, maxX, maxY, rangeX, rangeY };
  }, [roofLocal]);

  const screenToLocal = useCallback(
    (clientX: number, clientY: number, rect: DOMRect) => {
      const pad = 40;
      const scale = Math.min(
        (rect.width - pad * 2) / roofBounds.rangeX,
        (rect.height - pad * 2) / roofBounds.rangeY,
        15
      );
      const cx = (roofBounds.minX + roofBounds.maxX) / 2;
      const cy = (roofBounds.minY + roofBounds.maxY) / 2;
      const tx = rect.width / 2 - cx * scale;
      const ty = rect.height / 2 + cy * scale;
      const localX = (clientX - rect.left - tx) / scale;
      const localY = -(clientY - rect.top - ty) / scale;
      return { x: localX, y: localY };
    },
    [roofBounds]
  );

  const handlePanelMouseDown = useCallback(
    (e: React.MouseEvent<SVGGElement>, id: string) => {
      e.stopPropagation();
      const panel = panels.find((p) => p.id === id);
      if (!panel) return;
      setDragging(id);
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const local = screenToLocal(e.clientX, e.clientY, rect);
      setDragStart({
        panelX: panel.x,
        panelY: panel.y,
        mouseX: local.x,
        mouseY: local.y,
      });
    },
    [panels, screenToLocal]
  );

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (dragging) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const local = screenToLocal(e.clientX, e.clientY, rect);

      if (isPointInPolygon(local.x, local.y, roofLocal)) {
        const newPanel: PlacedPanel = {
          id: `panel-${Date.now()}`,
          x: snapToGrid(local.x, 0.5),
          y: snapToGrid(local.y, 0.5),
          width: PANEL_WIDTH_M,
          height: PANEL_HEIGHT_M,
          rotation: 0,
        };
        onPanelsChange([...panels, newPanel]);
      }
    },
    [panels, roofLocal, onPanelsChange, dragging, screenToLocal]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!dragging || !dragStart) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const local = screenToLocal(e.clientX, e.clientY, rect);
      const dx = local.x - dragStart.mouseX;
      const dy = local.y - dragStart.mouseY;
      const newX = snapToGrid(dragStart.panelX + dx, 0.5);
      const newY = snapToGrid(dragStart.panelY + dy, 0.5);

      if (isPointInPolygon(newX, newY, roofLocal)) {
        const newPanels = panels.map((p) =>
          p.id === dragging ? { ...p, x: newX, y: newY } : p
        );
        onPanelsChange(newPanels);
        setDragStart((prev) => prev ? { ...prev, panelX: newX, panelY: newY, mouseX: local.x, mouseY: local.y } : null);
      }
    },
    [dragging, dragStart, panels, roofLocal, onPanelsChange, screenToLocal]
  );

  const handleMouseUp = useCallback(() => {
    setDragging(null);
  }, []);

  const handleRemovePanel = useCallback(
    (id: string) => {
      onPanelsChange(panels.filter((p) => p.id !== id));
    },
    [panels, onPanelsChange]
  );

  const svgTransform = useMemo(() => {
    const pad = 40;
    const scale = Math.min(
      (400 - pad * 2) / roofBounds.rangeX,
      (300 - pad * 2) / roofBounds.rangeY,
      12
    );
    const cx = (roofBounds.minX + roofBounds.maxX) / 2;
    const cy = (roofBounds.minY + roofBounds.maxY) / 2;
    const tx = 200 - cx * scale;
    const ty = 150 + cy * scale;
    return `translate(${tx}, ${ty}) scale(${scale}, ${-scale})`;
  }, [roofBounds]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Solar Panel Placement</h3>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-600">
            {panels.length} panels · {totalCapacityKW.toFixed(1)} kW
          </span>
          <button
            type="button"
            onClick={handleAddPanel}
            className="rounded-lg bg-gradient-to-r from-accent-blue-500 to-energy-500 px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
          >
            + Add Panel
          </button>
        </div>
      </div>
      <p className="text-xs text-gray-500">
        Click on the roof to place panels. Drag to reposition. Right-click to remove.
      </p>
      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-lg border border-gray-200 bg-gray-50"
        style={{ height: 300 }}
        onClick={handleCanvasClick}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 400 300`}
          className="cursor-crosshair"
        >
          <g transform={svgTransform}>
            <polygon
              points={roofLocal.map((p) => `${p.x},${p.y}`).join(" ")}
              fill="rgba(251, 191, 36, 0.3)"
              stroke="#f59e0b"
              strokeWidth={0.3}
            />
            {panels.map((p) => (
              <g
                key={p.id}
                transform={`translate(${p.x}, ${p.y}) rotate(${p.rotation})`}
                onMouseDown={(e) => handlePanelMouseDown(e, p.id)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  handleRemovePanel(p.id);
                }}
                style={{ cursor: dragging === p.id ? "grabbing" : "grab" }}
              >
                <rect
                  x={-p.width / 2}
                  y={-p.height / 2}
                  width={p.width}
                  height={p.height}
                  fill="#3b82f6"
                  stroke="#1d4ed8"
                  strokeWidth={0.2}
                  opacity={0.8}
                />
              </g>
            ))}
          </g>
        </svg>
      </div>
    </div>
  );
}
