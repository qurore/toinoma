import { cn } from "@/lib/utils";

const steps = [
  { number: 1, label: "利用規約" },
  { number: 2, label: "プロフィール" },
  { number: 3, label: "Stripe連携" },
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
                    "flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-colors",
                    isCompleted && "bg-primary text-primary-foreground",
                    isCurrent && "bg-primary text-primary-foreground",
                    isFuture && "border-2 border-border bg-card text-muted-foreground"
                  )}
                >
                  {isCompleted ? "\u2713" : step.number}
                </div>
                <span
                  className={cn(
                    "mt-2 text-center text-xs font-medium",
                    isCompleted && "text-primary",
                    isCurrent && "text-foreground",
                    isFuture && "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line */}
              {i < steps.length - 1 && (
                <div className="mt-4 flex flex-1 items-center px-2">
                  <div
                    className={cn(
                      "h-px w-full transition-colors",
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
