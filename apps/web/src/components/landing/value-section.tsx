const values = [
  {
    title: "AI採点で即フィードバック",
    description:
      "記述式も部分点をAIが即座に判定。出題者定義のルーブリックに基づく採点と改善アドバイスで、自己採点の手間を解消します。",
  },
  {
    title: "大学生が作る本格問題",
    description:
      "実際の入試を熟知した大学生作問者が作成するオリジナル入試対策問題。実戦力を鍛える本番さながらの演習に挑戦できます。",
  },
  {
    title: "主要9科目を完全カバー",
    description:
      "数学・英語・国語から理科3科目、社会3科目まで主要科目を網羅。志望校に合わせた科目別の対策が可能です。",
  },
  {
    title: "得点分析で弱点を可視化",
    description:
      "過去の成績推移やジャンル別の正答率を自動集計。得意・苦手を数値で把握し、効率的な学習戦略を立てられます。",
  },
];

export function ValueSection() {
  return (
    <section className="py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Section header */}
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
            学習を加速する4つの強み
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            問題の発見から解答・採点・分析まで、一気通貫で支援します。
          </p>
        </div>

        {/* Value cards grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {values.map((item, index) => (
            <div
              key={item.title}
              className="rounded-2xl border border-border bg-card p-6"
            >
              {/* Ordinal number */}
              <span className="mb-4 block text-sm font-medium text-muted-foreground">
                {String(index + 1).padStart(2, "0")}
              </span>

              {/* Title */}
              <h3 className="font-display text-base font-semibold leading-snug">
                {item.title}
              </h3>

              {/* Description */}
              <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
