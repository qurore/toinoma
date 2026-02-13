import { Search, Brain, BookOpen, TrendingUp } from "lucide-react";

const values = [
  {
    icon: Search,
    title: "統一マーケットプレイス",
    description:
      "科目・大学・難易度で絞り込み。バラバラだった問題を一箇所で発見できます。",
  },
  {
    icon: Brain,
    title: "AI自動採点",
    description:
      "出題者が定義したルーブリックに基づき、AIが即座に採点。部分点も対応。",
  },
  {
    icon: BookOpen,
    title: "詳細フィードバック",
    description:
      "採点結果だけでなく、改善のための具体的なアドバイスをAIが生成します。",
  },
  {
    icon: TrendingUp,
    title: "出題者の収益化",
    description:
      "問題を公開するだけで継続的な収益。販売分析で改善ポイントも把握できます。",
  },
];

export function ValueSection() {
  return (
    <section className="py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-16 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">
            特徴
          </p>
          <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
            問の間が解決すること
          </h2>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {values.map((item) => (
            <div
              key={item.title}
              className="group rounded-lg border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10">
                <item.icon className="h-5 w-5 text-primary" />
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
