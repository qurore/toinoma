import type { Subject, Difficulty } from "../types";

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
