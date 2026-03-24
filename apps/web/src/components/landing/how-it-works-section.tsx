import { Search, FileText, Brain } from "lucide-react";
import { cn } from "@/lib/utils";

const steps = [
  {
    icon: Search,
    step: 1,
    title: "問題を探す",
    description:
      "科目・難易度・大学別にフィルタリング。自分のレベルに合った問題セットを見つけましょう。",
  },
  {
    icon: FileText,
    step: 2,
    title: "解答する",
    description:
      "実際の入試形式で解答を提出。記述式・マークシート・穴埋めなど、多様な出題形式に対応しています。",
  },
  {
    icon: Brain,
    step: 3,
    title: "AI採点を受ける",
    description:
      "出題者定義のルーブリックに基づき、記述式も部分点付きで即座に採点。改善アドバイスも提供されます。",
  },
];

export function HowItWorksSection() {
  return (
    <section className="py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Section header */}
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <p className="mb-3 text-sm font-semibold tracking-widest text-primary">
            使い方
          </p>
          <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
            3ステップで始める
          </h2>
          <p className="mt-4 text-muted-foreground">
            アカウント登録後、すぐに問題を解いてAI採点を受けられます。
          </p>
        </div>

        {/* Steps */}
        <div className="mx-auto max-w-4xl">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-0">
            {steps.map((item, index) => (
              <div key={item.step} className="relative flex flex-col items-center text-center">
                {/* Connecting line between steps (desktop only) */}
                {index < steps.length - 1 && (
                  <div
                    className="absolute left-[calc(50%+2.5rem)] top-8 hidden h-[2px] w-[calc(100%-5rem)] bg-gradient-to-r from-primary/30 to-primary/10 md:block"
                    aria-hidden="true"
                  />
                )}

                {/* Step number badge + icon container */}
                <div className="relative mb-6">
                  {/* Outer glow ring */}
                  <div className="absolute -inset-2 rounded-full bg-primary/5" />

                  {/* Icon circle */}
                  <div className="relative flex h-16 w-16 items-center justify-center rounded-full border-2 border-primary/20 bg-card shadow-sm">
                    <item.icon className="h-6 w-6 text-primary" />
                  </div>

                  {/* Number badge */}
                  <span
                    className={cn(
                      "absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold shadow-sm",
                      "bg-primary text-primary-foreground"
                    )}
                  >
                    {item.step}
                  </span>
                </div>

                {/* Title */}
                <h3 className="font-display text-lg font-semibold">
                  {item.title}
                </h3>

                {/* Description */}
                <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
