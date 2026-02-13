import { Search, FileText, Brain, TrendingUp } from "lucide-react";

const steps = [
  {
    icon: Search,
    step: 1,
    title: "問題を探す",
    description: "科目や大学、難易度で自分に合った問題セットを見つけましょう。",
  },
  {
    icon: FileText,
    step: 2,
    title: "解答を提出",
    description: "テキスト入力、マークシート、画像アップロードで解答を送信。",
  },
  {
    icon: Brain,
    step: 3,
    title: "AI採点を受ける",
    description: "出題者のルーブリックに基づき、AIが即座に採点・フィードバック。",
  },
  {
    icon: TrendingUp,
    step: 4,
    title: "実力を伸ばす",
    description: "フィードバックを活かして弱点を克服。成績推移も確認できます。",
  },
];

export function HowItWorksSection() {
  return (
    <section className="bg-secondary/50 py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-16 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">
            使い方
          </p>
          <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
            4ステップで始める
          </h2>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((item) => (
            <div key={item.step} className="relative text-center">
              {/* Connector line */}
              {item.step < 4 && (
                <div className="absolute left-[calc(50%+2rem)] top-8 hidden h-[2px] w-[calc(100%-4rem)] bg-border lg:block" />
              )}

              <div className="relative mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-card shadow-sm">
                <item.icon className="h-6 w-6 text-primary" />
                <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {item.step}
                </span>
              </div>

              <h3 className="font-display text-lg font-semibold">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
