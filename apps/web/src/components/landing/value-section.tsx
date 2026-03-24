import { Brain, GraduationCap, BookOpen, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

const values = [
  {
    icon: Brain,
    title: "AI採点で即フィードバック",
    description:
      "記述式も部分点をAIが即座に判定。出題者定義のルーブリックに基づく採点と改善アドバイスで、自己採点の手間を解消します。",
    accent: "bg-primary/10 text-primary",
    iconBg: "group-hover:bg-primary/15",
  },
  {
    icon: GraduationCap,
    title: "大学生が作る本格問題",
    description:
      "実際の入試を熟知した大学生作問者が作成するオリジナル入試対策問題。実戦力を鍛える本番さながらの演習に挑戦できます。",
    accent: "bg-accent/10 text-accent",
    iconBg: "group-hover:bg-accent/15",
  },
  {
    icon: BookOpen,
    title: "主要9科目を完全カバー",
    description:
      "数学・英語・国語から理科3科目、社会3科目まで主要科目を網羅。志望校に合わせた科目別の対策が可能です。",
    accent: "bg-info/10 text-info",
    iconBg: "group-hover:bg-info/15",
  },
  {
    icon: BarChart3,
    title: "得点分析で弱点を可視化",
    description:
      "過去の成績推移やジャンル別の正答率を自動集計。得意・苦手を数値で把握し、効率的な学習戦略を立てられます。",
    accent: "bg-warning/10 text-warning",
    iconBg: "group-hover:bg-warning/15",
  },
];

export function ValueSection() {
  return (
    <section className="py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Section header */}
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">
            特徴
          </p>
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
              className="group relative rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-1.5 hover:border-primary/20 hover:shadow-[0_8px_30px_hsl(152_40%_14%/0.08)] animate-fade-up opacity-0"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Subtle top accent bar */}
              <div className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

              {/* Icon container */}
              <div
                className={cn(
                  "mb-5 flex h-14 w-14 items-center justify-center rounded-2xl transition-all duration-300 group-hover:scale-105 group-hover:shadow-md",
                  item.accent,
                  item.iconBg
                )}
              >
                <item.icon className="h-6 w-6" strokeWidth={1.75} />
              </div>

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
