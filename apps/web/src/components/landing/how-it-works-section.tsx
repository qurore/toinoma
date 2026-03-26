const steps = [
  {
    step: 1,
    title: "問題を探す",
    description:
      "科目・難易度・大学別にフィルタリング。自分のレベルに合った問題セットを見つけましょう。",
  },
  {
    step: 2,
    title: "解答する",
    description:
      "実際の入試形式で解答を提出。記述式・マークシート・穴埋めなど、多様な出題形式に対応しています。",
  },
  {
    step: 3,
    title: "AI採点を受ける",
    description:
      "出題者定義のルーブリックに基づき、記述式も部分点付きで即座に採点。改善アドバイスも提供されます。",
  },
];

export function HowItWorksSection() {
  return (
    <section className="bg-secondary/30 py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Section header */}
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
            3ステップで始める
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            アカウント登録後、すぐに問題を解いてAI採点を受けられます。
          </p>
        </div>

        {/* Steps */}
        <div className="mx-auto max-w-4xl">
          <div className="grid grid-cols-1 gap-12 md:grid-cols-3 md:gap-8">
            {steps.map((item) => (
              <div
                key={item.step}
                className="flex flex-col items-center text-center"
              >
                {/* Step number */}
                <span className="mb-5 text-4xl font-bold text-foreground/15">
                  {item.step}
                </span>

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
