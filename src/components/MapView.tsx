"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Map, { Source, Layer, NavigationControl, GeolocateControl } from "react-map-gl/maplibre";
import type { MapLayerMouseEvent, MapRef } from "react-map-gl/maplibre";
import type { Feature, Polygon, FeatureCollection } from "geojson";
import "maplibre-gl/dist/maplibre-gl.css";

interface MapViewProps {
  center: [number, number]; // [lng, lat]
  zoom: number;
  buildings: Feature<Polygon>[];
  selectedBuilding: Feature<Polygon> | null;
  onMapClick: (lat: number, lon: number) => void;
  onBuildingSelect: (feature: Feature<Polygon>) => void;
  isLoading: boolean;
}

export default function MapView({
  center,
  zoom,
  buildings,
  selectedBuilding,
  onMapClick,
  onBuildingSelect,
  isLoading,
}: MapViewProps) {
  const mapRef = useRef<MapRef>(null);
  const [viewState, setViewState] = useState({
    longitude: center[0],
    latitude: center[1],
    zoom: zoom,
  });

  useEffect(() => {
    setViewState((prev) => ({
      ...prev,
      longitude: center[0],
      latitude: center[1],
      zoom: zoom,
    }));
  }, [center, zoom]);

  const handleClick = useCallback(
    (e: MapLayerMouseEvent) => {
      const { lng, lat } = e.lngLat;

      // Check if clicked on an existing building feature
      if (buildings.length > 0) {
        const features = mapRef.current?.queryRenderedFeatures(e.point, {
          layers: ["buildings-fill"],
        });
        if (features && features.length > 0) {
          const clickedBuilding = buildings.find(
            (b) => b.properties?.id === features[0].properties?.id
          );
          if (clickedBuilding) {
            onBuildingSelect(clickedBuilding);
            return;
          }
        }
      }

      onMapClick(lat, lng);
    },
    [buildings, onMapClick, onBuildingSelect]
  );

  const buildingsGeoJSON: FeatureCollection<Polygon> = {
    type: "FeatureCollection",
    features: buildings,
  };

  const selectedGeoJSON: FeatureCollection<Polygon> | null = selectedBuilding
    ? {
        type: "FeatureCollection",
        features: [selectedBuilding],
      }
    : null;

  return (
    <Map
      ref={mapRef}
      {...viewState}
      onMove={(evt) => setViewState(evt.viewState)}
      onClick={handleClick}
      style={{ width: "100%", height: "100%" }}
      mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
      attributionControl={{}}
      cursor="crosshair"
    >
      <NavigationControl position="bottom-right" />
      <GeolocateControl position="bottom-right" />

      {/* All building footprints */}
      {buildings.length > 0 && (
        <Source id="buildings" type="geojson" data={buildingsGeoJSON}>
          <Layer
            id="buildings-fill"
            type="fill"
            paint={{
              "fill-color": "#fbbf24",
              "fill-opacity": 0.3,
            }}
          />
          <Layer
            id="buildings-outline"
            type="line"
            paint={{
              "line-color": "#f59e0b",
              "line-width": 2,
            }}
          />
        </Source>
      )}

      {/* Selected building highlight */}
      {selectedGeoJSON && (
        <Source id="selected-building" type="geojson" data={selectedGeoJSON}>
          <Layer
            id="selected-fill"
            type="fill"
            paint={{
              "fill-color": "#f97316",
              "fill-opacity": 0.5,
            }}
          />
          <Layer
            id="selected-outline"
            type="line"
            paint={{
              "line-color": "#ea580c",
              "line-width": 3,
            }}
          />
        </Source>
      )}

      {/* Click marker */}
      {isLoading && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="h-8 w-8 animate-ping rounded-full bg-solar-400 opacity-75" />
        </div>
      )}
    </Map>
  );
}
