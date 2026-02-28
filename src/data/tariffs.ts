export interface TariffSlab {
  from: number;
  to: number;
  rate: number; // ₹ per kWh
}

export interface DISCOM {
  id: string;
  name: string;
  state: string;
  fixedCharge: number; // ₹ per month
  slabs: TariffSlab[];
  /** Feed-in tariff for excess solar export to grid (₹/kWh). Net metering credit rate. */
  exportRate: number;
}

export const discoms: DISCOM[] = [
  {
    id: "bescom",
    name: "BESCOM",
    state: "Karnataka",
    fixedCharge: 85,
    exportRate: 3.74, // KERC feed-in tariff for net metering export
    slabs: [
      { from: 0, to: 30, rate: 4.15 },
      { from: 31, to: 100, rate: 5.60 },
      { from: 101, to: 200, rate: 7.15 },
      { from: 201, to: 500, rate: 8.20 },
      { from: 501, to: Infinity, rate: 9.50 },
    ],
  },
  {
    id: "tangedco",
    name: "TANGEDCO",
    state: "Tamil Nadu",
    fixedCharge: 50,
    exportRate: 2.75, // ~75% of avg tariff for export
    slabs: [
      { from: 0, to: 100, rate: 0 },
      { from: 101, to: 200, rate: 2.50 },
      { from: 201, to: 500, rate: 5.50 },
      { from: 501, to: Infinity, rate: 8.00 },
    ],
  },
  {
    id: "msedcl",
    name: "MSEDCL",
    state: "Maharashtra",
    fixedCharge: 100,
    exportRate: 3.35, // State feed-in for net metering
    slabs: [
      { from: 0, to: 100, rate: 4.71 },
      { from: 101, to: 300, rate: 7.88 },
      { from: 301, to: 500, rate: 10.29 },
      { from: 501, to: Infinity, rate: 12.54 },
    ],
  },
  {
    id: "bypl",
    name: "BYPL",
    state: "Delhi",
    fixedCharge: 125,
    exportRate: 3.25, // DERC feed-in for net metering
    slabs: [
      { from: 0, to: 200, rate: 3.00 },
      { from: 201, to: 400, rate: 4.50 },
      { from: 401, to: 800, rate: 6.50 },
      { from: 801, to: 1200, rate: 7.75 },
      { from: 1201, to: Infinity, rate: 8.50 },
    ],
  },
];

export function calculateMonthlyBill(discom: DISCOM, monthlyUnits: number): number {
  let bill = discom.fixedCharge;
  let remaining = monthlyUnits;

  for (const slab of discom.slabs) {
    if (remaining <= 0) break;
    const slabWidth = slab.to === Infinity ? remaining : slab.to - slab.from + 1;
    const unitsInSlab = Math.min(remaining, slabWidth);
    bill += unitsInSlab * slab.rate;
    remaining -= unitsInSlab;
  }

  return bill;
}

/**
 * Calculate annual savings breakdown: self-consumption (bill reduction) + export revenue.
 * Self-consumption: units offset reduce grid purchase and bill.
 * Export: excess generation credited at feed-in tariff (net metering).
 */
export function calculateSavingsBreakdown(
  discom: DISCOM,
  monthlyConsumption: number,
  monthlySolarGeneration: number
): { selfConsumptionSavings: number; exportRevenue: number; total: number } {
  const billWithout = calculateMonthlyBill(discom, monthlyConsumption);
  const netConsumption = Math.max(0, monthlyConsumption - monthlySolarGeneration);
  const billWith = calculateMonthlyBill(discom, netConsumption);
  const selfConsumptionSavings = (billWithout - billWith) * 12;

  const monthlyExport = Math.max(0, monthlySolarGeneration - monthlyConsumption);
  const exportRevenue = monthlyExport * discom.exportRate * 12;

  return {
    selfConsumptionSavings: Math.round(selfConsumptionSavings),
    exportRevenue: Math.round(exportRevenue),
    total: Math.round(selfConsumptionSavings + exportRevenue),
  };
}

/**
 * Calculate annual savings from solar: bill reduction (self-consumption) + export revenue.
 */
export function calculateAnnualSavings(
  discom: DISCOM,
  monthlyConsumption: number,
  monthlySolarGeneration: number
): number {
  return calculateSavingsBreakdown(discom, monthlyConsumption, monthlySolarGeneration).total;
}
