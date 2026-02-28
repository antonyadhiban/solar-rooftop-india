"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import type { Feature, Polygon } from "geojson";
import { fetchBuildingFootprints, fetchSolarIrradiance, geocodeAddress } from "@/lib/api";
import {
  calculateSystemSize,
  calculateAnnualGeneration,
  calculateSubsidy,
  calculateSystemCost,
  calculateNetCost,
  calculatePaybackPeriod,
  calculateCumulativeSavings,
  generateYearlySavingsData,
  formatINR,
  SQFT_PER_SQ_M,
  USABLE_ROOF_FRACTION,
  SQ_M_PER_KW,
  PERFORMANCE_RATIO,
  PANEL_DEGRADATION_RATE,
  ELECTRICITY_ESCALATION_RATE,
} from "@/lib/calculations";
import { discoms, calculateSavingsBreakdown, type DISCOM } from "@/data/tariffs";
import ROIDashboard from "@/components/ROIDashboard";
import AssumptionsSection from "@/components/AssumptionsSection";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

interface SolarData {
  monthlyGHI: Record<string, number>;
  annualAvgGHI: number;
}

type Step = "map" | "configure" | "results";

export default function CalculatorPage() {
  const [step, setStep] = useState<Step>("map");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([77.5946, 12.9716]); // Bangalore
  const [mapZoom, setMapZoom] = useState(12);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [buildingFootprints, setBuildingFootprints] = useState<Feature<Polygon>[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState<Feature<Polygon> | null>(null);
  const [roofArea, setRoofArea] = useState<number>(0);
  const [isLoadingBuildings, setIsLoadingBuildings] = useState(false);
  const [isLoadingSolar, setIsLoadingSolar] = useState(false);
  const [solarData, setSolarData] = useState<SolarData | null>(null);
  const [selectedDiscom, setSelectedDiscom] = useState<DISCOM>(discoms[0]);
  const [monthlyConsumption, setMonthlyConsumption] = useState(300);
  const [systemSizeOverride, setSystemSizeOverride] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addressName, setAddressName] = useState<string>("");
  const [areaUnit, setAreaUnit] = useState<"m2" | "sqft">("m2");
  const [consumptionScope, setConsumptionScope] = useState<"household" | "building">("household");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const calculatedSystemSize = calculateSystemSize(roofArea);
  const systemSize = systemSizeOverride ?? calculatedSystemSize;

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setError(null);
    try {
      const result = await geocodeAddress(searchQuery);
      if (result) {
        setMapCenter([result.lon, result.lat]);
        setMapZoom(17);
        setAddressName(result.displayName);
      } else {
        setError("Address not found. Try a different search term.");
      }
    } catch {
      setError("Search failed. Please try again.");
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery]);

  const handleMapClick = useCallback(async (lat: number, lon: number) => {
    setSelectedLocation({ lat, lon });
    setIsLoadingBuildings(true);
    setError(null);
    setBuildingFootprints([]);
    setSelectedBuilding(null);

    try {
      const footprints = await fetchBuildingFootprints(lat, lon);
      if (footprints.length > 0) {
        setBuildingFootprints(footprints);
        // Auto-select the closest building
        setSelectedBuilding(footprints[0]);
        // Calculate area using turf
        const turfArea = (await import("@turf/area")).default;
        const area = turfArea(footprints[0]);
        setRoofArea(Math.round(area));
      } else {
        setError("No building footprint found at this location. Try clicking on a building or enter roof area manually.");
        setRoofArea(0);
      }
    } catch {
      // On OSM failure, still show the bottom panel so user can enter area manually
      setError("Could not auto-detect building footprint. Enter your roof area manually below.");
      setRoofArea(0);
      // Use a placeholder feature to trigger the bottom panel
      setSelectedBuilding({ type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [[]] } } as Feature<Polygon>);
    } finally {
      setIsLoadingBuildings(false);
    }
  }, []);

  const handleBuildingSelect = useCallback(async (feature: Feature<Polygon>) => {
    setSelectedBuilding(feature);
    const turfArea = (await import("@turf/area")).default;
    const area = turfArea(feature);
    setRoofArea(Math.round(area));
  }, []);

  const handleProceedToConfigure = useCallback(async () => {
    if (!selectedLocation) return;
    setIsLoadingSolar(true);
    setError(null);
    try {
      const data = await fetchSolarIrradiance(selectedLocation.lat, selectedLocation.lon);
      setSolarData(data);
      setStep("configure");
    } catch {
      setError("Failed to fetch solar data. Using default values for India.");
      setSolarData({ monthlyGHI: {}, annualAvgGHI: 4.8 });
      setStep("configure");
    } finally {
      setIsLoadingSolar(false);
    }
  }, [selectedLocation]);

  const handleCalculate = useCallback(() => {
    setStep("results");
  }, []);

  // Calculation results
  const annualGHI = solarData?.annualAvgGHI ?? 4.8;
  const annualGeneration = calculateAnnualGeneration(systemSize, annualGHI);
  const monthlyGeneration = Math.round(annualGeneration / 12);
  const subsidy = calculateSubsidy(systemSize);
  const systemCost = calculateSystemCost(systemSize);
  const netCost = calculateNetCost(systemSize);
  const savingsBreakdown = calculateSavingsBreakdown(selectedDiscom, monthlyConsumption, monthlyGeneration);
  const annualSavings = savingsBreakdown.total;
  const paybackPeriod = calculatePaybackPeriod(netCost.average, annualSavings);
  const savings10Year = calculateCumulativeSavings(annualSavings, 10);
  const savings25Year = calculateCumulativeSavings(annualSavings, 25);
  const yearlyData = generateYearlySavingsData(annualSavings, netCost.average, 25);

  // Generate shareable URL
  const shareableParams = new URLSearchParams({
    lat: (selectedLocation?.lat ?? 0).toFixed(4),
    lon: (selectedLocation?.lon ?? 0).toFixed(4),
    area: roofArea.toString(),
    size: systemSize.toString(),
    discom: selectedDiscom.id,
    consumption: monthlyConsumption.toString(),
    ghi: annualGHI.toFixed(2),
    scope: consumptionScope,
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Step indicator */}
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-3 sm:px-6">
          {[
            { id: "map" as Step, label: "1. Select Roof" },
            { id: "configure" as Step, label: "2. Configure" },
            { id: "results" as Step, label: "3. Results" },
          ].map((s, i) => (
            <div key={s.id} className="flex items-center gap-2">
              {i > 0 && <div className="h-px w-6 bg-gray-300 sm:w-12" />}
              <button
                onClick={() => {
                  if (s.id === "map") setStep("map");
                  else if (s.id === "configure" && solarData) setStep("configure");
                  else if (s.id === "results" && solarData) setStep("results");
                }}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition sm:px-4 sm:text-sm ${
                  step === s.id
                    ? "bg-gradient-to-r from-accent-blue-500 via-indigo-500 to-energy-500 text-white"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                {s.label}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Step 1: Map */}
      {step === "map" && (
        <div className="relative flex flex-col" style={{ height: "calc(100vh - 120px)" }}>
          {/* Search bar */}
          <div className="absolute top-4 left-4 right-4 z-10 mx-auto max-w-xl">
            <div className="flex overflow-hidden rounded-xl bg-white shadow-lg">
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search for an address in India..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="flex-1 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none"
              />
              <button
                onClick={handleSearch}
                disabled={isSearching}
                className="bg-gradient-to-r from-accent-blue-500 to-energy-500 px-4 text-white transition opacity-90 hover:opacity-100 disabled:opacity-50"
              >
                {isSearching ? (
                  <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                )}
              </button>
            </div>
            {error && (
              <div className="mt-2 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">
                {error}
              </div>
            )}
          </div>

          {/* Map */}
          <div className="flex-1">
            <MapView
              center={mapCenter}
              zoom={mapZoom}
              buildings={buildingFootprints}
              selectedBuilding={selectedBuilding}
              onMapClick={handleMapClick}
              onBuildingSelect={handleBuildingSelect}
              isLoading={isLoadingBuildings}
            />
          </div>

          {/* Bottom panel */}
          {(selectedBuilding || roofArea > 0) && (
            <div className="absolute bottom-4 left-4 right-4 z-10 mx-auto max-w-xl">
              <div className="rounded-xl bg-white p-4 shadow-lg">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-gray-900">Selected Roof</h3>
                    {addressName && (
                      <p className="text-xs text-gray-500 truncate max-w-xs">{addressName}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <div className="text-2xl font-bold gradient-text">
                        {areaUnit === "m2" ? roofArea : Math.round(roofArea * SQFT_PER_SQ_M)}
                        {areaUnit === "m2" ? " m²" : " sq ft"}
                      </div>
                      <div className="flex rounded-lg border border-gray-200 p-0.5">
                        <button
                          type="button"
                          onClick={() => setAreaUnit("m2")}
                          className={`rounded px-2 py-0.5 text-xs font-medium ${areaUnit === "m2" ? "bg-gradient-to-r from-accent-blue-500 to-energy-500 text-white" : "text-gray-500 hover:bg-gray-100"}`}
                        >
                          m²
                        </button>
                        <button
                          type="button"
                          onClick={() => setAreaUnit("sqft")}
                          className={`rounded px-2 py-0.5 text-xs font-medium ${areaUnit === "sqft" ? "bg-gradient-to-r from-accent-blue-500 to-energy-500 text-white" : "text-gray-500 hover:bg-gray-100"}`}
                        >
                          sq ft
                        </button>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">Estimated roof area</div>
                  </div>
                </div>
                {roofArea === 0 && (
                  <div className="mb-3">
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                      Enter roof area manually ({areaUnit === "m2" ? "m²" : "sq ft"})
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min={areaUnit === "m2" ? 10 : 100}
                        max={areaUnit === "m2" ? 10000 : 107640}
                        value={roofArea ? (areaUnit === "m2" ? roofArea : Math.round(roofArea * SQFT_PER_SQ_M)) : ""}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setRoofArea(areaUnit === "m2" ? val : val / SQFT_PER_SQ_M);
                        }}
                        className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-accent-blue-400"
                        placeholder={areaUnit === "m2" ? "e.g., 100" : "e.g., 1,076"}
                      />
                      <div className="flex rounded-lg border border-gray-200 p-0.5">
                        <button
                          type="button"
                          onClick={() => setAreaUnit("m2")}
                          className={`rounded px-2 py-1 text-xs font-medium ${areaUnit === "m2" ? "bg-gradient-to-r from-accent-blue-500 to-energy-500 text-white" : "text-gray-500 hover:bg-gray-100"}`}
                        >
                          m²
                        </button>
                        <button
                          type="button"
                          onClick={() => setAreaUnit("sqft")}
                          className={`rounded px-2 py-1 text-xs font-medium ${areaUnit === "sqft" ? "bg-gradient-to-r from-accent-blue-500 to-energy-500 text-white" : "text-gray-500 hover:bg-gray-100"}`}
                        >
                          sq ft
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                <button
                  onClick={handleProceedToConfigure}
                  disabled={roofArea === 0 || isLoadingSolar}
                  className="w-full rounded-lg bg-gradient-to-r from-accent-blue-500 via-indigo-500 to-energy-500 py-3 font-semibold text-white transition opacity-90 hover:opacity-100 disabled:opacity-50"
                >
                  {isLoadingSolar ? "Fetching Solar Data..." : "Get Solar Estimate →"}
                </button>
              </div>
            </div>
          )}

          {/* Click instruction */}
          {!selectedBuilding && !isLoadingBuildings && (
            <div className="absolute bottom-4 left-4 right-4 z-10 mx-auto max-w-xl">
              <div className="rounded-xl bg-white/90 px-4 py-3 text-center text-sm text-gray-600 shadow-lg backdrop-blur-sm">
                Click on any building on the map to detect its roof area
              </div>
            </div>
          )}

          {isLoadingBuildings && (
            <div className="absolute bottom-4 left-4 right-4 z-10 mx-auto max-w-xl">
              <div className="flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 shadow-lg">
                <svg className="h-5 w-5 animate-spin text-accent-blue-500" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="text-sm text-gray-600">Detecting building footprint...</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Configure */}
      {step === "configure" && (
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
          <h2 className="mb-6 text-2xl font-bold text-gray-900">Configure Your Solar System</h2>

          <div className="space-y-6">
            {/* Solar Irradiance Info */}
            <div className="rounded-xl border border-accent-blue-200 bg-accent-blue-50 p-4">
              <h3 className="mb-2 font-semibold text-accent-blue-800">Solar Irradiance at Your Location</h3>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold gradient-text">{annualGHI.toFixed(2)}</span>
                <span className="text-sm text-accent-blue-700">kWh/m&sup2;/day (annual average)</span>
              </div>
              <p className="mt-1 text-xs text-accent-blue-600">Source: NASA POWER API (2021-2023 average)</p>
              {solarData?.monthlyGHI && Object.keys(solarData.monthlyGHI).length > 0 && (
                <div className="mt-3 grid grid-cols-6 gap-1 sm:grid-cols-12">
                  {Object.entries(solarData.monthlyGHI).map(([month, val]) => (
                    <div key={month} className="text-center">
                      <div className="text-[10px] text-accent-blue-600">{month}</div>
                      <div className="text-xs font-semibold text-accent-blue-800">{val.toFixed(1)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* System Size */}
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <h3 className="mb-3 font-semibold text-gray-900">System Size</h3>
              <div className="mb-2 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-gray-900">{systemSize}</span>
                <span className="text-sm text-gray-500">kW</span>
              </div>
              <p className="mb-3 text-xs text-gray-500">
                Based on {roofArea} m² ({Math.round(roofArea * SQFT_PER_SQ_M).toLocaleString()} sq ft) roof &times; 80% usable &divide; 10 m²/kW = {calculatedSystemSize} kW
              </p>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Adjust system size (kW)
              </label>
              <input
                type="range"
                min={1}
                max={Math.max(20, calculatedSystemSize * 2)}
                step={0.5}
                value={systemSize}
                onChange={(e) => setSystemSizeOverride(Number(e.target.value))}
                className="w-full accent-indigo-500"
              />
              <div className="flex justify-between text-xs text-gray-400">
                <span>1 kW</span>
                <span>{Math.max(20, calculatedSystemSize * 2)} kW</span>
              </div>
            </div>

            {/* DISCOM Selection */}
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <h3 className="mb-3 font-semibold text-gray-900">Your Electricity Provider</h3>
              <select
                value={selectedDiscom.id}
                onChange={(e) => {
                  const d = discoms.find((d) => d.id === e.target.value);
                  if (d) setSelectedDiscom(d);
                }}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-accent-blue-400"
              >
                {discoms.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.state} / {d.name}
                  </option>
                ))}
              </select>
              <div className="mt-3">
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Who consumes this power?
                </label>
                <div className="mb-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setConsumptionScope("household")}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                      consumptionScope === "household"
                        ? "border-accent-blue-500 bg-accent-blue-50 text-accent-blue-700"
                        : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    My household
                  </button>
                  <button
                    type="button"
                    onClick={() => setConsumptionScope("building")}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                      consumptionScope === "building"
                        ? "border-accent-blue-500 bg-accent-blue-50 text-accent-blue-700"
                        : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    Total building (shared)
                  </button>
                </div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Monthly electricity consumption (kWh)
                </label>
                <input
                  type="number"
                  min={50}
                  max={5000}
                  value={monthlyConsumption}
                  onChange={(e) => setMonthlyConsumption(Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-accent-blue-400"
                />
                <p className="mt-1 text-xs text-gray-500">
                  {roofArea > 500
                    ? "Large roof detected — enter total building consumption if this is shared solar (apartment/common area)."
                    : "Your household usage. For shared roofs, enter total building consumption."}
                </p>
                {monthlyGeneration > monthlyConsumption * 2 && (
                  <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
                    <strong>Heads up:</strong> Your solar generation ({monthlyGeneration.toLocaleString()} kWh/mo) far exceeds consumption ({monthlyConsumption} kWh/mo). If this is an apartment roof, is {monthlyConsumption} your flat&apos;s usage or the building&apos;s total? Entering total building consumption will give more accurate savings.
                  </div>
                )}
              </div>
            </div>

            {/* Quick Summary */}
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <h3 className="mb-3 font-semibold text-gray-900">Quick Preview</h3>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <div className="text-xs text-gray-500">Annual Generation</div>
                  <div className="text-lg font-bold text-gray-900">{annualGeneration.toLocaleString()} kWh</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">PM Surya Ghar Subsidy</div>
                  <div className="text-lg font-bold text-green-600">{formatINR(subsidy)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Net Cost (avg)</div>
                  <div className="text-lg font-bold text-gray-900">{formatINR(netCost.average)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Annual Savings</div>
                  <div className="text-lg font-bold gradient-text">{formatINR(annualSavings)}</div>
                </div>
              </div>
            </div>

            <button
              onClick={handleCalculate}
              className="w-full rounded-xl bg-gradient-to-r from-accent-blue-500 via-indigo-500 to-energy-500 py-4 text-lg font-bold text-white shadow-lg transition opacity-90 hover:opacity-100"
            >
              View Full Results &amp; ROI Dashboard →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Results */}
      {step === "results" && (
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
          {/* Header */}
          <div className="mb-8 text-center">
            <h2 className="mb-2 text-3xl font-bold text-gray-900">Your Solar ROI Report</h2>
            <p className="text-gray-500">
              {selectedLocation
                ? `Location: ${selectedLocation.lat.toFixed(4)}°N, ${selectedLocation.lon.toFixed(4)}°E`
                : ""}
              {addressName && ` • ${addressName.split(",").slice(0, 2).join(",")}`}
            </p>
            <p className="mt-1 text-sm text-gray-600">
              Consumption: {monthlyConsumption.toLocaleString()} kWh/month ({consumptionScope === "household" ? "your household" : "total building (shared solar)"})
            </p>
          </div>

          {/* Key Metrics */}
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: "System Size",
                value: `${systemSize} kW`,
                sub: `${roofArea} m² roof`,
                color: "text-gray-900",
              },
              {
                label: "Annual Generation",
                value: `${annualGeneration.toLocaleString()} kWh`,
                sub: `${monthlyGeneration} kWh/month`,
                color: "gradient-text",
              },
              {
                label: "PM Surya Ghar Subsidy",
                value: formatINR(subsidy),
                sub:
                  systemSize > 10
                    ? "Capped at 10 kW (residential limit)"
                    : systemSize <= 3
                      ? "₹30,000/kW"
                      : "₹30K/kW (≤3) + ₹18K/kW (>3)",
                color: "text-green-600",
              },
              {
                label: "Payback Period",
                value: paybackPeriod === Infinity ? "N/A" : `${paybackPeriod} years`,
                sub: `Annual savings: ${formatINR(annualSavings)}`,
                color: "text-energy-600",
              },
            ].map((metric) => (
              <div key={metric.label} className="rounded-xl border border-gray-200 bg-white p-5">
                <div className="mb-1 text-xs font-medium text-gray-500">{metric.label}</div>
                <div className={`text-2xl font-bold ${metric.color}`}>{metric.value}</div>
                <div className="mt-1 text-xs text-gray-400">{metric.sub}</div>
              </div>
            ))}
          </div>

          {/* Cost Breakdown */}
          <div className="mb-8 grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <h3 className="mb-4 text-lg font-bold text-gray-900">Cost Breakdown</h3>
              <div className="space-y-3">
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <span className="text-gray-600">System Cost (estimated)</span>
                  <span className="font-semibold">{formatINR(systemCost.low)} - {formatINR(systemCost.high)}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-2 text-green-600">
                  <span>PM Surya Ghar Subsidy</span>
                  <span className="font-semibold">- {formatINR(subsidy)}</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="font-bold text-gray-900">Net Cost After Subsidy</span>
                  <span className="font-bold text-gray-900">{formatINR(netCost.low)} - {formatINR(netCost.high)}</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <h3 className="mb-4 text-lg font-bold text-gray-900">Savings Projection</h3>
              <div className="space-y-3">
                {(savingsBreakdown.exportRevenue > 0 || savingsBreakdown.selfConsumptionSavings > 0) && (
                  <div className="mb-3 rounded-lg border border-gray-100 bg-gray-50 p-3">
                    <p className="mb-2 text-xs font-medium text-gray-600">Savings breakdown (net metering)</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Self-consumption (bill reduction)</span>
                        <span className="font-medium">{formatINR(savingsBreakdown.selfConsumptionSavings)}</span>
                      </div>
                      {savingsBreakdown.exportRevenue > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Export to grid (₹{selectedDiscom.exportRate}/kWh)</span>
                          <span className="font-medium">{formatINR(savingsBreakdown.exportRevenue)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <span className="text-gray-600">Annual Savings (Year 1)</span>
                  <span className="font-semibold gradient-text">{formatINR(annualSavings)}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <span className="text-gray-600">10-Year Total Savings</span>
                  <span className="font-semibold gradient-text">{formatINR(savings10Year)}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <span className="text-gray-600">25-Year Total Savings</span>
                  <span className="font-semibold gradient-text">{formatINR(savings25Year)}</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="font-bold text-gray-900">25-Year Net Profit</span>
                  <span className="font-bold text-green-600">{formatINR(savings25Year - netCost.average)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tariff Info */}
          <div className="mb-8 rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="mb-4 text-lg font-bold text-gray-900">
              Tariff Details — {selectedDiscom.state} / {selectedDiscom.name}
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                    <th className="pb-2 pr-4">Slab (units)</th>
                    <th className="pb-2 pr-4">Rate (₹/kWh)</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedDiscom.slabs.map((slab, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      <td className="py-2 pr-4 text-gray-700">
                        {slab.from} - {slab.to === Infinity ? "above" : slab.to}
                      </td>
                      <td className="py-2 pr-4 font-medium text-gray-900">₹{slab.rate.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-gray-400">Fixed charge: ₹{selectedDiscom.fixedCharge}/month</p>
          </div>

          {/* ROI Charts */}
          <ROIDashboard yearlyData={yearlyData} netCost={netCost.average} />

          {/* Assumptions & Methodology */}
          <div className="mt-8">
            <AssumptionsSection
              usableRoofFraction={USABLE_ROOF_FRACTION}
              sqMPerKW={SQ_M_PER_KW}
              performanceRatio={PERFORMANCE_RATIO}
              degradationRate={PANEL_DEGRADATION_RATE}
              escalationRate={ELECTRICITY_ESCALATION_RATE}
              exportRate={selectedDiscom.exportRate}
              discomName={selectedDiscom.name}
            />
          </div>

          {/* Share Section */}
          <div className="mt-8 rounded-xl border border-accent-blue-200 bg-accent-blue-50 p-6 text-center">
            <h3 className="mb-2 text-lg font-bold text-accent-blue-800">Share Your Results</h3>
            <p className="mb-4 text-sm text-accent-blue-600">
              Share this analysis with your family or on social media
            </p>
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <button
                onClick={() => {
                  const url = `${window.location.origin}/results?${shareableParams.toString()}`;
                  navigator.clipboard.writeText(url);
                  alert("Link copied to clipboard!");
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-accent-blue-700 shadow-sm transition hover:bg-accent-blue-100"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
                Copy Link
              </button>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(
                  `Check out my solar rooftop analysis! A ${systemSize}kW system could save me ${formatINR(annualSavings)}/year. ${typeof window !== "undefined" ? window.location.origin : ""}/results?${shareableParams.toString()}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-green-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-green-600"
              >
                Share on WhatsApp
              </a>
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                  `My rooftop can generate ${annualGeneration.toLocaleString()} kWh/year with a ${systemSize}kW solar system! Savings: ${formatINR(annualSavings)}/year. Check yours:`
                )}&url=${encodeURIComponent(`${typeof window !== "undefined" ? window.location.origin : ""}/results?${shareableParams.toString()}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-600"
              >
                Share on Twitter
              </a>
            </div>
          </div>

          {/* Back button */}
          <div className="mt-6 text-center">
            <button
              onClick={() => setStep("configure")}
              className="text-sm font-medium text-accent-blue-600 hover:text-accent-blue-700"
            >
              ← Back to Configuration
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
