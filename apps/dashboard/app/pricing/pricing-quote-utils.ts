import type { PricingConfigV2, PricingIntervalV2 } from "../lib/api-client";

export type QuantityValidation = {
  isValid: boolean;
  isBelowMin: boolean;
  isAboveMax: boolean;
  isInvalidStep: boolean;
};

export type DisplayTotals = {
  displayTotal: number;
  annualTotal?: number;
  intervalLabel: string;
};

export type DisplayPriceEntry = {
  volume: number;
  total: number;
};

export function parseQuantity(value: string): number | null {
  const normalized = value.split(",").join("").trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0 || !Number.isInteger(parsed)) {
    return null;
  }
  return parsed;
}

export function validateQuantity(quantity: number | null, config: PricingConfigV2): QuantityValidation {
  if (!Number.isFinite(quantity ?? NaN)) {
    return {
      isValid: false,
      isBelowMin: false,
      isAboveMax: false,
      isInvalidStep: false,
    };
  }
  const value = quantity as number;
  const isBelowMin = value < config.min_volume;
  const isAboveMax = value > config.max_volume;
  const isInvalidStep = config.step_size <= 0 ? true : value % config.step_size !== 0;
  return {
    isValid: !isBelowMin && !isAboveMax && !isInvalidStep,
    isBelowMin,
    isAboveMax,
    isInvalidStep,
  };
}

export function resolveDisplayTotals(params: { roundedTotal: number; interval: PricingIntervalV2 }): DisplayTotals {
  const rounded = Number.isFinite(params.roundedTotal) ? params.roundedTotal : 0;
  if (params.interval === "year") {
    const annualTotal = Math.floor(rounded);
    const monthlyEquivalent = Math.floor(annualTotal / 12);
    return { displayTotal: monthlyEquivalent, annualTotal, intervalLabel: "/month" };
  }
  if (params.interval === "month") {
    return { displayTotal: Math.floor(rounded), intervalLabel: "/month" };
  }
  return { displayTotal: Math.floor(rounded), intervalLabel: "" };
}

export function calculateSavingsPercent(paygTotal: number | null, selectedTotal: number | null): number | null {
  if (!paygTotal || !selectedTotal || paygTotal <= 0) return null;
  const percent = Math.round((1 - selectedTotal / paygTotal) * 100);
  return percent > 0 ? percent : null;
}

export function formatCredits(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPricePerEmail(total: number, quantity: number): string {
  if (!Number.isFinite(total) || !Number.isFinite(quantity) || quantity <= 0) {
    return "--";
  }
  const value = total / quantity;
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 6,
  }).format(value);
}

export function extractPaygDisplayPrices(metadata?: Record<string, unknown>): DisplayPriceEntry[] {
  if (!metadata || typeof metadata !== "object") return [];
  const display = metadata.display_prices;
  if (!display || typeof display !== "object") return [];
  const payg = (display as { payg?: Record<string, unknown> }).payg;
  if (!payg || typeof payg !== "object") return [];
  return Object.entries(payg)
    .map(([volume, total]) => {
      const volumeValue = Number(volume);
      const totalValue = typeof total === "number" ? total : Number(total);
      if (!Number.isFinite(volumeValue) || !Number.isFinite(totalValue)) return null;
      return { volume: volumeValue, total: totalValue };
    })
    .filter((entry): entry is DisplayPriceEntry => entry !== null)
    .sort((a, b) => a.volume - b.volume);
}

export function formatVolumeLabel(volume: number): string {
  if (volume >= 1_000_000) {
    const value = volume / 1_000_000;
    const decimals = value % 1 === 0 ? 0 : 1;
    return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: decimals }).format(value)}M`;
  }
  if (volume >= 1_000) {
    const value = volume / 1_000;
    const decimals = value % 1 === 0 ? 0 : 1;
    return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: decimals }).format(value)}K`;
  }
  return `${volume}`;
}
