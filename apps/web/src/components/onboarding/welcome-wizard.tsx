"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  ChevronRight,
  ChevronLeft,
  Check,
  Sparkles,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { SUBJECT_LABELS } from "@toinoma/shared/constants";
import type { Subject } from "@/types/database";
import { saveOnboardingProfile } from "@/app/welcome/actions";

// ──────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────

const TOTAL_STEPS = 3;

const SUBJECT_ICONS: Record<Subject, string> = {
  math: "\u03A3",
  english: "Aa",
  japanese: "\u3042",
  physics: "\u2699",
  chemistry: "\u2697",
  biology: "\u2618",
  japanese_history: "\u26E9",
  world_history: "\u2605",
  geography: "\u25CE",
};

const STUDY_GOALS = [
  { value: "common_test", label: "共通テスト対策", description: "大学入学共通テストに向けた総合学習" },
  { value: "national_secondary", label: "国公立二次対策", description: "国公立大学の二次試験・個別学力検査" },
  { value: "private_general", label: "私立一般対策", description: "私立大学の一般入試・個別試験" },
  { value: "entrance_exam", label: "総合型・推薦対策", description: "総合型選抜・学校推薦型選抜の対策" },
  { value: "daily_study", label: "日常学習・定期テスト", description: "定期テストや日々の学習サポート" },
  { value: "other", label: "その他", description: "上記に当てはまらない学習目的" },
] as const;

// ──────────────────────────────────────────────
// Progress bar
// ──────────────────────────────────────────────

function ProgressBar({ step }: { step: number }) {
  const progress = (step / TOTAL_STEPS) * 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {step} / {TOTAL_STEPS}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Step 1: Display name
// ──────────────────────────────────────────────

function DisplayNameStep({
  displayName,
  setDisplayName,
  avatarUrl,
}: {
  displayName: string;
  setDisplayName: (v: string) => void;
  avatarUrl: string | null;
}) {
  const initials = (displayName || "?")
    .split(/[\s@]/)
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
          表示名を設定しましょう
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          他のユーザーに表示される名前です
        </p>
      </div>

      <div className="flex justify-center">
        <Avatar className="h-20 w-20">
          <AvatarImage src={avatarUrl ?? undefined} alt={displayName || ""} />
          <AvatarFallback className="bg-primary/10 text-xl font-semibold text-primary">
            {initials || <User className="h-8 w-8" />}
          </AvatarFallback>
        </Avatar>
      </div>

      <div className="mx-auto max-w-sm space-y-1.5">
        <div className="flex items-baseline justify-between">
          <Label htmlFor="welcome-display-name">表示名</Label>
          <span className="text-xs text-muted-foreground">
            {displayName.length}/50
          </span>
        </div>
        <Input
          id="welcome-display-name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="ニックネームを入力"
          maxLength={50}
          autoFocus
        />
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Step 2: Subject selection
// ──────────────────────────────────────────────

function SubjectStep({
  selectedSubjects,
  toggleSubject,
}: {
  selectedSubjects: Set<Subject>;
  toggleSubject: (s: Subject) => void;
}) {
  const subjects = Object.entries(SUBJECT_LABELS) as [Subject, string][];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
          興味のある科目を選びましょう
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          おすすめの問題セットを表示するために使います（複数選択可）
        </p>
      </div>

      <div className="mx-auto grid max-w-md grid-cols-2 gap-3 sm:grid-cols-3">
        {subjects.map(([key, label]) => {
          const selected = selectedSubjects.has(key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggleSubject(key)}
              aria-pressed={selected}
              className={cn(
                "group relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all duration-200",
                selected
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border hover:border-primary/30 hover:bg-muted/50"
              )}
            >
              {/* Check indicator */}
              {selected && (
                <div className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary">
                  <Check className="h-2.5 w-2.5 text-primary-foreground" />
                </div>
              )}
              <span className="text-2xl">{SUBJECT_ICONS[key]}</span>
              <span
                className={cn(
                  "text-xs font-medium",
                  selected ? "text-primary" : "text-foreground"
                )}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Step 3: Study goal
// ──────────────────────────────────────────────

function StudyGoalStep({
  selectedGoal,
  setSelectedGoal,
}: {
  selectedGoal: string;
  setSelectedGoal: (v: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
          学習の目的を教えてください
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          あなたに合った学習体験を提供します
        </p>
      </div>

      <div className="mx-auto max-w-sm space-y-2" role="radiogroup" aria-label="学習目的">
        {STUDY_GOALS.map((goal) => (
          <button
            key={goal.value}
            type="button"
            role="radio"
            aria-checked={selectedGoal === goal.value}
            onClick={() => setSelectedGoal(goal.value)}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3.5 text-left transition-all duration-200",
              selectedGoal === goal.value
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-border hover:border-primary/30 hover:bg-muted/50"
            )}
          >
            <div
              className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                selectedGoal === goal.value
                  ? "border-primary bg-primary"
                  : "border-muted-foreground/30"
              )}
            >
              {selectedGoal === goal.value && (
                <Check className="h-3 w-3 text-primary-foreground" />
              )}
            </div>
            <div className="min-w-0">
              <span
                className={cn(
                  "block text-sm font-medium",
                  selectedGoal === goal.value
                    ? "text-primary"
                    : "text-foreground"
                )}
              >
                {goal.label}
              </span>
              <span className="block text-xs text-muted-foreground mt-0.5">
                {goal.description}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Celebration screen
// ──────────────────────────────────────────────

function CelebrationScreen() {
  return (
    <div className="space-y-6 text-center">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
        <Sparkles className="h-10 w-10 text-primary" />
      </div>
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Toinomaへようこそ
        </h2>
        <p className="mt-2 text-muted-foreground">
          セットアップが完了しました。さっそく問題を探してみましょう。
        </p>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Main wizard
// ──────────────────────────────────────────────

interface WelcomeWizardProps {
  initialDisplayName: string;
  initialAvatarUrl: string | null;
  initialSubjects: Subject[];
}

export function WelcomeWizard({
  initialDisplayName,
  initialAvatarUrl,
  initialSubjects,
}: WelcomeWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  // Step 1: display name
  const [displayName, setDisplayName] = useState(initialDisplayName);

  // Step 2: subjects
  const [selectedSubjects, setSelectedSubjects] = useState<Set<Subject>>(
    () => new Set(initialSubjects)
  );

  // Step 3: study goal
  const [selectedGoal, setSelectedGoal] = useState("");

  const toggleSubject = useCallback((subject: Subject) => {
    setSelectedSubjects((prev) => {
      const next = new Set(prev);
      if (next.has(subject)) {
        next.delete(subject);
      } else {
        next.add(subject);
      }
      return next;
    });
  }, []);

  const handleNext = useCallback(async () => {
    if (step < TOTAL_STEPS) {
      setStep((s) => s + 1);
      return;
    }

    // Final step — save and show celebration
    setIsSaving(true);
    try {
      const result = await saveOnboardingProfile({
        displayName,
        subjects: Array.from(selectedSubjects),
        studyGoal: selectedGoal,
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      setShowCelebration(true);
    } catch {
      toast.error("保存に失敗しました");
    } finally {
      setIsSaving(false);
    }
  }, [step, displayName, selectedSubjects, selectedGoal]);

  const handleBack = useCallback(() => {
    if (step > 1) {
      setStep((s) => s - 1);
    }
  }, [step]);

  const handleSkip = useCallback(async () => {
    if (step < TOTAL_STEPS) {
      setStep((s) => s + 1);
      return;
    }

    // Skip on last step — still save whatever we have
    setIsSaving(true);
    try {
      await saveOnboardingProfile({
        displayName,
        subjects: Array.from(selectedSubjects),
        studyGoal: selectedGoal,
      });
      setShowCelebration(true);
    } catch {
      // Silently proceed even on failure
      setShowCelebration(true);
    } finally {
      setIsSaving(false);
    }
  }, [step, displayName, selectedSubjects, selectedGoal]);

  const handleGoToDashboard = useCallback(() => {
    router.push("/dashboard");
  }, [router]);

  const handleGoToExplore = useCallback(() => {
    router.push("/explore");
  }, [router]);

  // Celebration screen
  if (showCelebration) {
    return (
      <Card className="mx-auto w-full max-w-lg animate-fade-up">
        <CardContent className="p-8">
          <CelebrationScreen />
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button onClick={handleGoToExplore} size="lg">
              <Sparkles className="mr-2 h-4 w-4" />
              問題を探す
            </Button>
            <Button
              onClick={handleGoToDashboard}
              variant="outline"
              size="lg"
            >
              ダッシュボードへ
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mx-auto w-full max-w-lg">
      <CardContent className="p-6 sm:p-8">
        {/* Progress */}
        <ProgressBar step={step} />

        {/* Step content */}
        <div className="mt-8">
          {step === 1 && (
            <DisplayNameStep
              displayName={displayName}
              setDisplayName={setDisplayName}
              avatarUrl={initialAvatarUrl}
            />
          )}
          {step === 2 && (
            <SubjectStep
              selectedSubjects={selectedSubjects}
              toggleSubject={toggleSubject}
            />
          )}
          {step === 3 && (
            <StudyGoalStep
              selectedGoal={selectedGoal}
              setSelectedGoal={setSelectedGoal}
            />
          )}
        </div>

        {/* Navigation */}
        <div className="mt-8 flex items-center justify-between">
          <div>
            {step > 1 ? (
              <Button variant="ghost" size="sm" onClick={handleBack}>
                <ChevronLeft className="mr-1 h-4 w-4" />
                戻る
              </Button>
            ) : (
              <div />
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleSkip}>
              スキップ
            </Button>
            <Button onClick={handleNext} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : step < TOTAL_STEPS ? (
                <ChevronRight className="mr-1 h-4 w-4" />
              ) : (
                <Check className="mr-1 h-4 w-4" />
              )}
              {step < TOTAL_STEPS ? "次へ" : "完了"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
