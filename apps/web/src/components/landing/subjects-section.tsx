import Link from "next/link";
import {
  Sigma,
  Languages,
  PenLine,
  Atom,
  FlaskConical,
  Dna,
  Landmark,
  Globe,
  Map,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { SUBJECTS, SUBJECT_LABELS } from "@toinoma/shared/constants";
import type { Subject } from "@toinoma/shared/types";

// Per-subject visual configuration: icon, gradient, and border accent
const SUBJECT_CONFIG: Record<
  Subject,
  { icon: LucideIcon; gradient: string; border: string }
> = {
  math: {
    icon: Sigma,
    gradient: "from-blue-500/10 to-indigo-500/10 group-hover:from-blue-500/20 group-hover:to-indigo-500/20",
    border: "group-hover:border-blue-300",
  },
  english: {
    icon: Languages,
    gradient: "from-emerald-500/10 to-teal-500/10 group-hover:from-emerald-500/20 group-hover:to-teal-500/20",
    border: "group-hover:border-emerald-300",
  },
  japanese: {
    icon: PenLine,
    gradient: "from-rose-500/10 to-pink-500/10 group-hover:from-rose-500/20 group-hover:to-pink-500/20",
    border: "group-hover:border-rose-300",
  },
  physics: {
    icon: Atom,
    gradient: "from-amber-500/10 to-orange-500/10 group-hover:from-amber-500/20 group-hover:to-orange-500/20",
    border: "group-hover:border-amber-300",
  },
  chemistry: {
    icon: FlaskConical,
    gradient: "from-violet-500/10 to-purple-500/10 group-hover:from-violet-500/20 group-hover:to-purple-500/20",
    border: "group-hover:border-violet-300",
  },
  biology: {
    icon: Dna,
    gradient: "from-lime-500/10 to-green-500/10 group-hover:from-lime-500/20 group-hover:to-green-500/20",
    border: "group-hover:border-lime-300",
  },
  japanese_history: {
    icon: Landmark,
    gradient: "from-red-500/10 to-rose-500/10 group-hover:from-red-500/20 group-hover:to-rose-500/20",
    border: "group-hover:border-red-300",
  },
  world_history: {
    icon: Globe,
    gradient: "from-cyan-500/10 to-sky-500/10 group-hover:from-cyan-500/20 group-hover:to-sky-500/20",
    border: "group-hover:border-cyan-300",
  },
  geography: {
    icon: Map,
    gradient: "from-teal-500/10 to-emerald-500/10 group-hover:from-teal-500/20 group-hover:to-emerald-500/20",
    border: "group-hover:border-teal-300",
  },
};

// Icon color per subject for the icon itself
const SUBJECT_ICON_COLORS: Record<Subject, string> = {
  math: "text-blue-600",
  english: "text-emerald-600",
  japanese: "text-rose-600",
  physics: "text-amber-600",
  chemistry: "text-violet-600",
  biology: "text-lime-600",
  japanese_history: "text-red-600",
  world_history: "text-cyan-600",
  geography: "text-teal-600",
};

export function SubjectsSection() {
  return (
    <section className="bg-secondary/50 py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Section header */}
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">
            対応教科
          </p>
          <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
            9教科に対応
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            主要教科をカバー。志望校に合わせた科目を選んで学習を始めましょう。
          </p>
        </div>

        {/* Subject cards grid */}
        <div className="mx-auto grid max-w-4xl grid-cols-3 gap-3 sm:gap-4 lg:grid-cols-9 lg:max-w-none">
          {SUBJECTS.map((subject, index) => {
            const config = SUBJECT_CONFIG[subject];
            const IconComponent = config.icon;

            return (
              <Link
                key={subject}
                href={`/explore?subject=${subject}`}
                className="group block animate-fade-up opacity-0"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div
                  className={cn(
                    "flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-4 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-lg sm:p-5",
                    config.border
                  )}
                >
                  {/* Icon with gradient background */}
                  <div
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br transition-all duration-300 group-hover:scale-110 group-hover:shadow-md",
                      config.gradient
                    )}
                  >
                    <IconComponent
                      className={cn("h-5 w-5 transition-transform duration-300", SUBJECT_ICON_COLORS[subject])}
                    />
                  </div>

                  {/* Label */}
                  <span className="text-xs font-semibold transition-colors group-hover:text-primary">
                    {SUBJECT_LABELS[subject]}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
