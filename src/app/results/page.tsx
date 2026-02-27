"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import {
  calculateAnnualGeneration,
  calculateSubsidy,
  calculateSystemCost,
  calculateNetCost,
  calculatePaybackPeriod,
  calculateCumulativeSavings,
  generateYearlySavingsData,
  formatINR,
} from "@/lib/calculations";
import { discoms, calculateAnnualSavings } from "@/data/tariffs";
import ROIDashboard from "@/components/ROIDashboard";

function ResultsContent() {
  const searchParams = useSearchParams();

  const lat = parseFloat(searchParams.get("lat") || "12.9716");
  const lon = parseFloat(searchParams.get("lon") || "77.5946");
  const roofArea = parseInt(searchParams.get("area") || "100");
  const systemSize = parseFloat(searchParams.get("size") || "5");
  const discomId = searchParams.get("discom") || "bescom";
  const monthlyConsumption = parseInt(searchParams.get("consumption") || "300");
  const annualGHI = parseFloat(searchParams.get("ghi") || "4.8");

  const selectedDiscom = discoms.find((d) => d.id === discomId) || discoms[0];
  const annualGeneration = calculateAnnualGeneration(systemSize, annualGHI);
  const monthlyGeneration = Math.round(annualGeneration / 12);
  const subsidy = calculateSubsidy(systemSize);
  const systemCost = calculateSystemCost(systemSize);
  const netCost = calculateNetCost(systemSize);
  const annualSavings = calculateAnnualSavings(selectedDiscom, monthlyConsumption, monthlyGeneration);
  const paybackPeriod = calculatePaybackPeriod(netCost.average, annualSavings);
  const savings10Year = calculateCumulativeSavings(annualSavings, 10);
  const savings25Year = calculateCumulativeSavings(annualSavings, 25);
  const yearlyData = generateYearlySavingsData(annualSavings, netCost.average, 25);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-solar-200 bg-solar-50 px-4 py-1.5 text-sm font-medium text-solar-700">
          Shared Solar Analysis
        </div>
        <h1 className="mb-2 text-3xl font-bold text-gray-900">Solar Rooftop Analysis</h1>
        <p className="text-gray-500">
          Location: {lat.toFixed(4)}&deg;N, {lon.toFixed(4)}&deg;E &middot; {selectedDiscom.state}
        </p>
      </div>

      {/* Key Metrics */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "System Size",
            value: `${systemSize} kW`,
            sub: `${roofArea} m\u00B2 roof`,
            color: "text-gray-900",
          },
          {
            label: "Annual Generation",
            value: `${annualGeneration.toLocaleString()} kWh`,
            sub: `${monthlyGeneration} kWh/month`,
            color: "text-solar-600",
          },
          {
            label: "PM Surya Ghar Subsidy",
            value: formatINR(subsidy),
            sub: systemSize <= 3 ? "\u20B930,000/kW" : "\u20B930K/kW (\u22643) + \u20B918K/kW (>3)",
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
            <div className="flex justify-between border-b border-gray-100 pb-2">
              <span className="text-gray-600">Annual Savings (Year 1)</span>
              <span className="font-semibold text-solar-600">{formatINR(annualSavings)}</span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-2">
              <span className="text-gray-600">10-Year Total Savings</span>
              <span className="font-semibold text-solar-600">{formatINR(savings10Year)}</span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-2">
              <span className="text-gray-600">25-Year Total Savings</span>
              <span className="font-semibold text-solar-600">{formatINR(savings25Year)}</span>
            </div>
            <div className="flex justify-between pt-1">
              <span className="font-bold text-gray-900">25-Year Net Profit</span>
              <span className="font-bold text-green-600">{formatINR(savings25Year - netCost.average)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ROI Charts */}
      <ROIDashboard yearlyData={yearlyData} netCost={netCost.average} />

      {/* CTA */}
      <div className="mt-8 rounded-xl bg-gradient-to-r from-solar-500 to-energy-500 p-8 text-center">
        <h3 className="mb-2 text-2xl font-bold text-white">Want to calculate for your roof?</h3>
        <p className="mb-6 text-solar-100">
          Get your own personalized solar analysis in under 60 seconds
        </p>
        <a
          href="/calculator"
          className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-lg font-bold text-solar-600 shadow-lg transition hover:bg-solar-50"
        >
          Calculate Your Solar Potential
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </a>
      </div>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-solar-200 border-t-solar-500" />
            <p className="text-gray-500">Loading results...</p>
          </div>
        </div>
      }
    >
      <ResultsContent />
    </Suspense>
  );
}
