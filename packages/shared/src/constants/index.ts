import type { Subject, Difficulty, AnswerType } from "../types";

export const SUBJECTS: readonly Subject[] = [
  "math",
  "english",
  "japanese",
  "physics",
  "chemistry",
  "biology",
  "japanese_history",
  "world_history",
  "geography",
] as const;

export const DIFFICULTIES: readonly Difficulty[] = [
  "easy",
  "medium",
  "hard",
] as const;

export const SUBJECT_LABELS: Record<Subject, string> = {
  math: "数学",
  english: "英語",
  japanese: "国語",
  physics: "物理",
  chemistry: "化学",
  biology: "生物",
  japanese_history: "日本史",
  world_history: "世界史",
  geography: "地理",
} as const;

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: "基礎",
  medium: "標準",
  hard: "発展",
} as const;

export const ANSWER_TYPES: readonly AnswerType[] = [
  "essay",
  "mark_sheet",
  "fill_in_blank",
  "multiple_choice",
] as const;

export const ANSWER_TYPE_LABELS: Record<AnswerType, string> = {
  essay: "記述式",
  mark_sheet: "マークシート",
  fill_in_blank: "穴埋め",
  multiple_choice: "選択式",
} as const;

// Subscription tier constants (FR-026, FR-027)
// Pricing: Basic 498/4980, Pro 1980/17980 JPY
// AI cost margins: Basic ~40% (300 JPY raw/month), Pro ~25% (1500 JPY raw/month)
export const SUBSCRIPTION_TIERS = {
  free: {
    name: "Free",
    label: "フリー",
    monthlyPrice: 0,
    annualPrice: 0,
    gradingLimit: 3,
    collectionsLimit: 3,
    aiCostBudgetJpy: 0,
    description: "月3回までAI採点が利用可能",
  },
  basic: {
    name: "Basic",
    label: "ベーシック",
    monthlyPrice: 498,
    annualPrice: 4980,
    gradingLimit: 30,
    collectionsLimit: 20,
    aiCostBudgetJpy: 300,
    description: "月30回までAI採点が利用可能",
  },
  pro: {
    name: "Pro",
    label: "プロ",
    monthlyPrice: 1980,
    annualPrice: 17980,
    gradingLimit: -1, // unlimited
    collectionsLimit: -1, // unlimited
    aiCostBudgetJpy: 1500,
    description: "AI採点無制限・AI学習アシスタント利用可能",
  },
} as const;

export type SubscriptionTierKey = keyof typeof SUBSCRIPTION_TIERS;
