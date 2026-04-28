export { shuffleArray } from "./shuffle";
export { getResolvedTier, hasOverrideMismatch } from "./resolved-tier";

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

export function formatPrice(priceJpy: number): string {
  if (priceJpy === 0) return "無料";
  return `¥${priceJpy.toLocaleString("ja-JP")}`;
}

export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatDateShort(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "たった今";
  if (diffMins < 60) return `${diffMins}分前`;
  if (diffHours < 24) return `${diffHours}時間前`;
  if (diffDays < 7) return `${diffDays}日前`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}週間前`;
  return formatDateShort(d);
}

export function normalizeAnswer(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) =>
      String.fromCharCode(s.charCodeAt(0) - 0xfee0)
    )
    .toLowerCase();
}

export function calculateSellerPayout(priceJpy: number): number {
  const platformFee = calculatePlatformFee(priceJpy);
  return priceJpy - platformFee;
}

export function getScoreColor(
  score: number,
  maxScore: number
): "success" | "warning" | "destructive" {
  if (maxScore === 0) return "success";
  const percent = (score / maxScore) * 100;
  if (percent >= 70) return "success";
  if (percent >= 40) return "warning";
  return "destructive";
}
