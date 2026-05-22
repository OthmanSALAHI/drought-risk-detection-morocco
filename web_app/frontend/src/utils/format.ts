export const formatDecimal = (value: number, decimals = 3): string => (
  Number.isFinite(value) ? value.toFixed(decimals) : '0.000'
);
