import { Brain, GraduationCap, BookOpen, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

const values = [
  {
    icon: Brain,
    title: "AI採点",
    description:
      "記述式も部分点をAIが即座に判定。出題者定義のルーブリックに基づく高精度な採点で、自己採点の手間を解消します。",
    accent: "bg-primary/10 text-primary",
  },
  {
    icon: GraduationCap,
    title: "本格問題",
    description:
      "大学生作問者による大学入試対策問題。実際の入試を熟知した出題者が作る、実戦力を鍛えるオリジナル問題に挑戦できます。",
    accent: "bg-accent/10 text-accent",
  },
  {
    icon: BookOpen,
    title: "9科目対応",
    description:
      "数学・英語・国語から物理・化学・生物、日本史・世界史・地理まで主要科目を網羅。志望校に合わせた対策が可能です。",
    accent: "bg-info/10 text-info",
  },
  {
    icon: BarChart3,
    title: "学習分析",
    description:
      "得意・苦手を可視化して効率的に対策。過去の成績推移やジャンル別の正答率から、最適な学習戦略を立てられます。",
    accent: "bg-warning/10 text-warning",
  },
];

export function ValueSection() {
  return (
    <section className="py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Section header */}
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <p className="mb-3 text-sm font-semibold tracking-widest text-primary">
            特徴
          </p>
          <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
            学習を加速する4つの強み
          </h2>
          <p className="mt-4 text-muted-foreground">
            問の間は、問題の発見から解答・採点・分析まで一気通貫で支援します。
          </p>
        </div>

        {/* Value cards grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {values.map((item) => (
            <div
              key={item.title}
              className="group relative rounded-xl border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 hover:shadow-lg"
            >
              {/* Icon container */}
              <div
                className={cn(
                  "mb-5 flex h-12 w-12 items-center justify-center rounded-lg transition-transform duration-300 group-hover:scale-110",
                  item.accent
                )}
              >
                <item.icon className="h-6 w-6" />
              </div>

              {/* Title */}
              <h3 className="font-display text-lg font-semibold">
                {item.title}
              </h3>

              {/* Description */}
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
