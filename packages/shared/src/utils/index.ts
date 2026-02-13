export { shuffleArray } from "./shuffle";

export const PLATFORM_FEE_PERCENT = 15;

export function calculatePlatformFee(priceAmountJpy: number): number {
  return Math.round(priceAmountJpy * (PLATFORM_FEE_PERCENT / 100));
}

export function formatScore(score: number, maxScore: number): string {
  return `${score}/${maxScore}`;
}

export function formatScorePercent(score: number, maxScore: number): string {
  if (maxScore === 0) return "0%";
  return `${Math.round((score / maxScore) * 100)}%`;
}
