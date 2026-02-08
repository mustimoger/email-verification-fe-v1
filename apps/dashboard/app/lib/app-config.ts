type AppConfig = {
  overviewUsageRangeMonths: number;
};

const parsePositiveInt = (value: string, name: string) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }
  return parsed;
};

const rawOverviewUsageRangeMonths = process.env.NEXT_PUBLIC_OVERVIEW_USAGE_RANGE_MONTHS;
if (!rawOverviewUsageRangeMonths) {
  throw new Error("NEXT_PUBLIC_OVERVIEW_USAGE_RANGE_MONTHS is required.");
}

export const APP_CONFIG: AppConfig = {
  overviewUsageRangeMonths: parsePositiveInt(
    rawOverviewUsageRangeMonths,
    "NEXT_PUBLIC_OVERVIEW_USAGE_RANGE_MONTHS",
  ),
};
