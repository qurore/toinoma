import { SUBJECTS, SUBJECT_LABELS } from "@toinoma/shared/constants";
import type { Subject } from "@toinoma/shared/types";

const subjectEmojis: Record<Subject, string> = {
  math: "📐",
  english: "🌍",
  japanese: "📝",
  physics: "⚡",
  chemistry: "🧪",
  biology: "🧬",
  japanese_history: "🏯",
  world_history: "🌏",
  geography: "🗺️",
};

export function SubjectsSection() {
  return (
    <section className="py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-16 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">
            対応教科
          </p>
          <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
            9教科に対応
          </h2>
          <p className="mt-4 text-muted-foreground">
            主要教科をカバー。今後も対応教科を拡大していきます。
          </p>
        </div>

        <div className="mx-auto grid max-w-3xl grid-cols-3 gap-4 sm:grid-cols-3 lg:grid-cols-9 lg:max-w-none">
          {SUBJECTS.map((subject) => (
            <div
              key={subject}
              className="flex flex-col items-center gap-2 rounded-lg border border-border bg-card p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
            >
              <span className="text-2xl">{subjectEmojis[subject]}</span>
              <span className="text-xs font-medium">
                {SUBJECT_LABELS[subject]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
