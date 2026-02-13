import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const steps = [
  { number: 1, label: "利用規約" },
  { number: 2, label: "プロフィール" },
  { number: 3, label: "Stripe連携" },
];

export function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {steps.map((step, i) => (
        <div key={step.number} className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors",
                step.number < currentStep &&
                  "bg-primary text-primary-foreground",
                step.number === currentStep &&
                  "bg-primary text-primary-foreground animate-pulse-glow",
                step.number > currentStep &&
                  "border border-border bg-muted text-muted-foreground"
              )}
            >
              {step.number < currentStep ? (
                <Check className="h-4 w-4" />
              ) : (
                step.number
              )}
            </div>
            <span
              className={cn(
                "hidden text-sm font-medium sm:block",
                step.number === currentStep
                  ? "text-foreground"
                  : "text-muted-foreground"
              )}
            >
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={cn(
                "h-[2px] w-8 sm:w-12",
                step.number < currentStep ? "bg-primary" : "bg-border"
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}
