import { notFound } from "next/navigation";
import { requireSellerTos } from "@/lib/auth/require-seller";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import { QuestionEditForm } from "./question-edit-form";

export const metadata: Metadata = {
  title: "問題を編集 - 問の間",
};

interface QuestionRow {
  id: string;
  seller_id: string;
  question_type: string;
  question_text: string;
  subject: string;
  difficulty: string;
  points: number;
  model_answer: string | null;
  vertical_text: boolean;
  rubric: Record<string, unknown>;
  video_urls: Array<{
    url: string;
    path: string;
    title: string;
    size_bytes: number;
    mime_type: string;
    uploaded_at: string;
  }>;
  estimated_minutes: number | null;
  topic_tags: string[];
  created_at: string;
  updated_at: string;
}

export default async function EditQuestionPage({
  params,
}: {
  params: Promise<{ qid: string }>;
}) {
  const { user } = await requireSellerTos();
  const { qid } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase.from("questions")
    .select("*")
    .eq("id", qid)
    .single();

  if (error || !data) {
    notFound();
  }

  const question = data as QuestionRow;

  // Verify seller ownership
  if (question.seller_id !== user.id) {
    notFound();
  }

  return (
    <QuestionEditForm
      question={question}
    />
  );
}
