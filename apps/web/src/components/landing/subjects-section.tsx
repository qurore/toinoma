import Link from "next/link";
import { SUBJECTS, SUBJECT_LABELS } from "@toinoma/shared/constants";

export function SubjectsSection() {
  return (
    <section className="bg-secondary/50 py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Section header */}
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
            9教科に対応
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            主要教科をカバー。志望校に合わせた科目を選んで学習を始めましょう。
          </p>
        </div>

        {/* Subject cards grid */}
        <div className="mx-auto grid max-w-4xl grid-cols-3 gap-3 sm:gap-4 lg:max-w-none lg:grid-cols-9">
          {SUBJECTS.map((subject) => (
            <Link
              key={subject}
              href={`/explore?subject=${subject}`}
              className="group block"
              aria-label={`${SUBJECT_LABELS[subject]}の問題を探す`}
            >
              <div className="flex items-center justify-center rounded-xl border border-border bg-card px-4 py-4 transition-colors hover:border-primary/30 sm:py-5">
                <span className="text-sm font-semibold transition-colors group-hover:text-primary">
                  {SUBJECT_LABELS[subject]}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
