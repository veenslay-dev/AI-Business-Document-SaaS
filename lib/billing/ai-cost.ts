/**
 * Rough AI cost estimate from the tokens recorded on each call. Rates are per million tokens in USD
 * and default to a small OpenAI model. Set the AI_COST_* variables to match the model you really use.
 */
export type CostRates = { inputPerM: number; outputPerM: number; usdToInr: number };

export function costRates(): CostRates {
  const n = (v: string | undefined, d: number) => { const x = Number(v); return Number.isFinite(x) && x > 0 ? x : d; };
  return { inputPerM: n(process.env.AI_COST_INPUT_PER_M_USD, 0.15), outputPerM: n(process.env.AI_COST_OUTPUT_PER_M_USD, 0.6), usdToInr: n(process.env.USD_TO_INR, 88) };
}

export function estimateCostUsd(tokensIn: number, tokensOut: number, rates = costRates()): number {
  return (tokensIn / 1_000_000) * rates.inputPerM + (tokensOut / 1_000_000) * rates.outputPerM;
}
