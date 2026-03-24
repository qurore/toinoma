import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PrintStyles } from "@/components/print/print-styles";
import { PrintHeader } from "@/components/print/print-header";
import { PrintQuestion } from "@/components/print/print-question";
import { PrintClient } from "./print-client";
import type { Database } from "@/types/database";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data: ps } = await supabase
    .from("problem_sets")
    .select("title")
    .eq("id", id)
    .single();

  return {
    title: ps ? `印刷 - ${ps.title} | 問の間` : "印刷 | 問の間",
  };
}

type PrintMode = "problems" | "answers" | "combined";
type MarginPreset = "narrow" | "normal" | "wide";

const VALID_MODES: PrintMode[] = ["problems", "answers", "combined"];
const VALID_MARGINS: MarginPreset[] = ["narrow", "normal", "wide"];

type QuestionRow = Database["public"]["Tables"]["questions"]["Row"];

interface SectionData {
  sectionNumber: number;
  sectionTitle: string | null;
  questions: Array<{
    question: QuestionRow;
    position: number;
    pointsOverride: number | null;
  }>;
}

export default async function PrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mode?: string; margin?: string }>;
}) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;

  // Parse and validate search params
  const mode: PrintMode = VALID_MODES.includes(resolvedSearchParams.mode as PrintMode)
    ? (resolvedSearchParams.mode as PrintMode)
    : "problems";
  const margin: MarginPreset = VALID_MARGINS.includes(
    resolvedSearchParams.margin as MarginPreset
  )
    ? (resolvedSearchParams.margin as MarginPreset)
    : "normal";

  const supabase = await createClient();

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Purchase verification
  const { data: purchase } = await supabase
    .from("purchases")
    .select("id")
    .eq("user_id", user.id)
    .eq("problem_set_id", id)
    .single();

  if (!purchase) redirect(`/problem/${id}`);

  // Fetch problem set
  const { data: ps } = await supabase
    .from("problem_sets")
    .select("id, title, subject, university, difficulty, total_points")
    .eq("id", id)
    .single();

  if (!ps) notFound();

  // Fetch questions via junction table, ordered by section_number then position
  const { data: junctionRows } = await supabase
    .from("problem_set_questions")
    .select("question_id, section_number, section_title, position, points_override")
    .eq("problem_set_id", id)
    .order("section_number", { ascending: true })
    .order("position", { ascending: true });

  if (!junctionRows || junctionRows.length === 0) {
    return (
      <>
        <PrintStyles margin={margin} />
        <PrintClient problemSetId={id} />
        <div className="print-body print-page">
          <PrintHeader
            title={ps.title}
            mode={mode}
            date={formatDate(new Date())}
          />
          <p className="mt-10 text-center text-muted-foreground">
            この問題セットには問題が登録されていません
          </p>
        </div>
      </>
    );
  }

  // Fetch all questions in batch
  const questionIds = junctionRows.map((j) => j.question_id);
  const { data: questionsRaw } = await supabase.from("questions")
    .select(
      "id, seller_id, question_type, question_text, question_images, rubric, model_answer, model_answer_images, subject, topic_tags, difficulty, estimated_minutes, points, video_urls, vertical_text, created_at, updated_at"
    )
    .in("id", questionIds);

  if (!questionsRaw) notFound();

  // Index questions by ID for fast lookup
  const questionsById = new Map<string, QuestionRow>();
  for (const q of questionsRaw as QuestionRow[]) {
    questionsById.set(q.id, q);
  }

  // Group by section
  const sectionsMap = new Map<number, SectionData>();

  for (const junction of junctionRows) {
    const question = questionsById.get(junction.question_id);
    if (!question) continue;

    let section = sectionsMap.get(junction.section_number);
    if (!section) {
      section = {
        sectionNumber: junction.section_number,
        sectionTitle: junction.section_title,
        questions: [],
      };
      sectionsMap.set(junction.section_number, section);
    }

    section.questions.push({
      question,
      position: junction.position,
      pointsOverride: junction.points_override,
    });
  }

  const sections = Array.from(sectionsMap.values()).sort(
    (a, b) => a.sectionNumber - b.sectionNumber
  );

  const dateStr = formatDate(new Date());

  return (
    <>
      <PrintStyles margin={margin} />
      <PrintClient problemSetId={id} />

      {sections.map((section, sectionIdx) => {
        const sectionLabel = section.sectionTitle
          ? `大問${section.sectionNumber} — ${section.sectionTitle}`
          : `大問${section.sectionNumber}`;

        const sectionPoints = section.questions.reduce(
          (sum, q) => sum + (q.pointsOverride ?? q.question.points),
          0
        );

        return (
          <div
            key={section.sectionNumber}
            className={`print-body print-page ${sectionIdx > 0 ? "print-section-break" : ""}`}
          >
            {/* Page header */}
            <PrintHeader
              title={ps.title}
              sectionTitle={sectionLabel}
              mode={mode}
              date={dateStr}
            />

            {/* Section title bar */}
            <div className="print-section-title">
              {sectionLabel}
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({sectionPoints}点)
              </span>
            </div>

            {/* Questions */}
            {section.questions.map((entry) => (
              <PrintQuestion
                key={entry.question.id}
                question={entry.question}
                sectionNumber={section.sectionNumber}
                position={entry.position}
                pointsOverride={entry.pointsOverride}
                mode={mode}
              />
            ))}

            {/* Page footer */}
            <div className="print-page-footer">
              {ps.title} — {sectionLabel}
            </div>
          </div>
        );
      })}
    </>
  );
}

/**
 * Format date in Japanese style: 2026年3月23日
 */
function formatDate(date: Date): string {
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}
