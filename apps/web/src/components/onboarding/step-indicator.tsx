import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const steps = [
  { number: 1, label: "利用規約", description: "規約に同意" },
  { number: 2, label: "プロフィール", description: "販売者情報を入力" },
  { number: 3, label: "Stripe連携", description: "収益の受け取り設定" },
];

export function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="mx-auto max-w-md">
      <div className="flex items-start justify-between">
        {steps.map((step, i) => {
          const isCompleted = step.number < currentStep;
          const isCurrent = step.number === currentStep;
          const isFuture = step.number > currentStep;

          return (
            <div key={step.number} className="flex flex-1 items-start">
              {/* Step circle + label column */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "relative flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold transition-all duration-300",
                    isCompleted &&
                      "bg-primary text-primary-foreground shadow-[0_0_0_4px_hsl(142_71%_38%/0.15)]",
                    isCurrent &&
                      "bg-primary text-primary-foreground shadow-[0_0_0_4px_hsl(142_71%_38%/0.2)] animate-pulse-glow",
                    isFuture &&
                      "border-2 border-border bg-card text-muted-foreground"
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" strokeWidth={3} />
                  ) : (
                    step.number
                  )}
                </div>
                <span
                  className={cn(
                    "mt-2 text-center text-xs font-semibold",
                    isCompleted && "text-primary",
                    isCurrent && "text-foreground",
                    isFuture && "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
                <span
                  className={cn(
                    "mt-0.5 hidden text-center text-[10px] sm:block",
                    isCurrent
                      ? "text-muted-foreground"
                      : "text-muted-foreground/60"
                  )}
                >
                  {step.description}
                </span>
              </div>

              {/* Connector line */}
              {i < steps.length - 1 && (
                <div className="mt-5 flex flex-1 items-center px-2">
                  <div
                    className={cn(
                      "h-0.5 w-full rounded-full transition-colors duration-300",
                      step.number < currentStep ? "bg-primary" : "bg-border"
                    )}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
