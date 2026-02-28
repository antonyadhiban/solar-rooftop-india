"use client";

import { useState } from "react";

interface AssumptionsSectionProps {
  usableRoofFraction: number;
  sqMPerKW: number;
  performanceRatio: number;
  degradationRate: number;
  escalationRate: number;
  exportRate: number;
  discomName: string;
}

export default function AssumptionsSection({
  usableRoofFraction,
  sqMPerKW,
  performanceRatio,
  degradationRate,
  escalationRate,
  exportRate,
  discomName,
}: AssumptionsSectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-6 py-4 text-left"
      >
        <span className="font-semibold text-gray-900">Assumptions &amp; Methodology</span>
        <svg
          className={`h-5 w-5 text-gray-500 transition ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="border-t border-gray-100 px-6 py-4">
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-gray-500">Usable roof</dt>
              <dd className="font-medium">{usableRoofFraction * 100}%</dd>
            </div>
            <div>
              <dt className="text-gray-500">Panel density</dt>
              <dd className="font-medium">{sqMPerKW} m²/kW</dd>
            </div>
            <div>
              <dt className="text-gray-500">Performance ratio</dt>
              <dd className="font-medium">{performanceRatio * 100}%</dd>
            </div>
            <div>
              <dt className="text-gray-500">Tariff escalation</dt>
              <dd className="font-medium">{escalationRate * 100}%/year</dd>
            </div>
            <div>
              <dt className="text-gray-500">Panel degradation</dt>
              <dd className="font-medium">{degradationRate * 100}%/year</dd>
            </div>
            <div>
              <dt className="text-gray-500">Export tariff ({discomName})</dt>
              <dd className="font-medium">₹{exportRate}/kWh</dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
}
