/**
 * Solar Rooftop Calculation Engine
 * All calculations are performed client-side.
 */

// Constants
export const USABLE_ROOF_FRACTION = 0.8; // 80% of roof area is usable
export const SQ_M_PER_KW = 10; // 10 sq.m per kW of panels
export const PERFORMANCE_RATIO = 0.75; // System performance ratio (accounts for losses, shading, etc.)
export const COST_PER_KW_LOW = 50000; // ₹50,000 per kW installed (low estimate)
export const COST_PER_KW_HIGH = 60000; // ₹60,000 per kW installed (high estimate)
export const PANEL_DEGRADATION_RATE = 0.005; // 0.5% annual degradation
export const ELECTRICITY_ESCALATION_RATE = 0.05; // 5% annual tariff increase

/**
 * Calculate system size in kW based on roof area
 */
export function calculateSystemSize(roofAreaSqM: number): number {
  const usableArea = roofAreaSqM * USABLE_ROOF_FRACTION;
  return Math.round((usableArea / SQ_M_PER_KW) * 10) / 10; // Round to 1 decimal
}

/**
 * Calculate annual solar generation in kWh
 * @param systemSizeKW - System size in kW
 * @param annualGHI - Annual Global Horizontal Irradiance in kWh/m²/day (daily average)
 */
export function calculateAnnualGeneration(systemSizeKW: number, annualGHI: number): number {
  // Annual generation = System size × GHI (daily avg) × 365 × Performance Ratio
  return Math.round(systemSizeKW * annualGHI * 365 * PERFORMANCE_RATIO);
}

/**
 * Calculate PM Surya Ghar subsidy
 * Up to 3 kW: ₹30,000/kW
 * 3-10 kW: ₹18,000/kW for capacity above 3 kW
 * Above 10 kW: no additional subsidy
 */
export function calculateSubsidy(systemSizeKW: number): number {
  if (systemSizeKW <= 0) return 0;

  let subsidy = 0;

  if (systemSizeKW <= 3) {
    subsidy = systemSizeKW * 30000;
  } else if (systemSizeKW <= 10) {
    subsidy = 3 * 30000 + (systemSizeKW - 3) * 18000;
  } else {
    subsidy = 3 * 30000 + 7 * 18000; // Max subsidy capped at 10 kW
  }

  return Math.round(subsidy);
}

/**
 * Calculate system cost range
 */
export function calculateSystemCost(systemSizeKW: number): { low: number; high: number; average: number } {
  return {
    low: Math.round(systemSizeKW * COST_PER_KW_LOW),
    high: Math.round(systemSizeKW * COST_PER_KW_HIGH),
    average: Math.round(systemSizeKW * ((COST_PER_KW_LOW + COST_PER_KW_HIGH) / 2)),
  };
}

/**
 * Calculate net cost after subsidy
 */
export function calculateNetCost(systemSizeKW: number): { low: number; high: number; average: number } {
  const cost = calculateSystemCost(systemSizeKW);
  const subsidy = calculateSubsidy(systemSizeKW);
  return {
    low: Math.max(0, cost.low - subsidy),
    high: Math.max(0, cost.high - subsidy),
    average: Math.max(0, cost.average - subsidy),
  };
}

/**
 * Calculate payback period in years
 */
export function calculatePaybackPeriod(netCost: number, annualSavings: number): number {
  if (annualSavings <= 0) return Infinity;
  return Math.round((netCost / annualSavings) * 10) / 10;
}

/**
 * Calculate cumulative savings over N years with escalation and degradation
 */
export function calculateCumulativeSavings(
  annualSavings: number,
  years: number
): number {
  let total = 0;
  for (let y = 0; y < years; y++) {
    const escalationFactor = Math.pow(1 + ELECTRICITY_ESCALATION_RATE, y);
    const degradationFactor = Math.pow(1 - PANEL_DEGRADATION_RATE, y);
    total += annualSavings * escalationFactor * degradationFactor;
  }
  return Math.round(total);
}

/**
 * Generate yearly savings data for charts
 */
export function generateYearlySavingsData(
  annualSavings: number,
  netCost: number,
  years: number
): Array<{ year: number; savings: number; cumulative: number; netBenefit: number }> {
  const data = [];
  let cumulative = 0;
  for (let y = 1; y <= years; y++) {
    const escalationFactor = Math.pow(1 + ELECTRICITY_ESCALATION_RATE, y - 1);
    const degradationFactor = Math.pow(1 - PANEL_DEGRADATION_RATE, y - 1);
    const yearlySaving = Math.round(annualSavings * escalationFactor * degradationFactor);
    cumulative += yearlySaving;
    data.push({
      year: y,
      savings: yearlySaving,
      cumulative,
      netBenefit: cumulative - netCost,
    });
  }
  return data;
}

/**
 * Format currency in Indian format (₹)
 */
export function formatINR(amount: number): string {
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2)} Cr`;
  }
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(2)} L`;
  }
  return `₹${amount.toLocaleString('en-IN')}`;
}

/**
 * Parse NASA POWER API response to get annual average GHI
 */
export function parseNASAGHI(data: Record<string, number>): number {
  const values = Object.values(data).filter((v) => v !== -999);
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}
