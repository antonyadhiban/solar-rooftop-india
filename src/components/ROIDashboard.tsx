"use client";

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from "recharts";
import { formatINR } from "@/lib/calculations";

interface YearlyData {
  year: number;
  savings: number;
  cumulative: number;
  netBenefit: number;
}

interface ROIDashboardProps {
  yearlyData: YearlyData[];
  netCost: number;
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) {
  if (!active || !payload) return null;
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
      <p className="mb-1 text-xs font-semibold text-gray-500">Year {label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-sm" style={{ color: entry.color }}>
          {entry.name}: {formatINR(entry.value)}
        </p>
      ))}
    </div>
  );
}

export default function ROIDashboard({ yearlyData, netCost }: ROIDashboardProps) {
  const paybackYear = yearlyData.find((d) => d.netBenefit >= 0)?.year;

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-gray-900">ROI Dashboard</h3>

      {/* Cumulative Savings vs Investment */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6">
        <h4 className="mb-4 font-semibold text-gray-900">Cumulative Savings Over 25 Years</h4>
        <div className="h-72 sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={yearlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis
                dataKey="year"
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                tickLine={false}
                tickFormatter={(v) => {
                  if (Math.abs(v) >= 100000) return `${(v / 100000).toFixed(0)}L`;
                  if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(0)}K`;
                  return v.toString();
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine
                y={netCost}
                stroke="#ef4444"
                strokeDasharray="5 5"
                label={{ value: `Investment: ${formatINR(netCost)}`, position: "right", fontSize: 11, fill: "#ef4444" }}
              />
              {paybackYear && (
                <ReferenceLine
                  x={paybackYear}
                  stroke="#22c55e"
                  strokeDasharray="5 5"
                  label={{ value: `Payback: Year ${paybackYear}`, position: "top", fontSize: 11, fill: "#22c55e" }}
                />
              )}
              <Area
                type="monotone"
                dataKey="cumulative"
                name="Cumulative Savings"
                stroke="#f59e0b"
                strokeWidth={2}
                fill="url(#colorCumulative)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Yearly Savings */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6">
        <h4 className="mb-4 font-semibold text-gray-900">Annual Savings by Year</h4>
        <p className="mb-3 text-xs text-gray-500">
          Includes 5% annual tariff escalation and 0.5% panel degradation
        </p>
        <div className="h-64 sm:h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={yearlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis
                dataKey="year"
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                tickLine={false}
                tickFormatter={(v) => {
                  if (v >= 100000) return `${(v / 100000).toFixed(0)}L`;
                  if (v >= 1000) return `${(v / 1000).toFixed(0)}K`;
                  return v.toString();
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="savings"
                name="Annual Savings"
                fill="#f97316"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Net Benefit */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6">
        <h4 className="mb-4 font-semibold text-gray-900">Net Benefit (Savings - Investment)</h4>
        <div className="h-64 sm:h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={yearlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorBenefit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis
                dataKey="year"
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                tickLine={false}
                tickFormatter={(v) => {
                  if (Math.abs(v) >= 100000) return `${(v / 100000).toFixed(1)}L`;
                  if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(0)}K`;
                  return v.toString();
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={0} stroke="#9ca3af" />
              <Area
                type="monotone"
                dataKey="netBenefit"
                name="Net Benefit"
                stroke="#22c55e"
                strokeWidth={2}
                fill="url(#colorBenefit)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
