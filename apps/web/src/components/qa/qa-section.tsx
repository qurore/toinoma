import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { MessageCircleQuestion } from "lucide-react";
import { QaQuestionList } from "./qa-question-list";
import { QaQuestionForm } from "./qa-question-form";

// ── Data types passed to client components ─────────────────────────────
export interface QaQuestionData {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  question_id: string | null;
  created_at: string;
  updated_at: string;
  user: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  };
  answer_count: number;
  upvote_count: number;
  has_accepted_answer: boolean;
}

export interface QaAnswerData {
  id: string;
  body: string;
  is_accepted: boolean;
  upvotes: number;
  created_at: string;
  updated_at: string;
  user: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  };
  is_seller: boolean;
  user_has_upvoted: boolean;
}

// ── Server component: fetches Q&A data for a problem set ───────────────
interface QaSectionProps {
  problemSetId: string;
  sellerId: string;
  userId: string | null;
}

export async function QaSection({
  problemSetId,
  sellerId,
  userId,
}: QaSectionProps) {
  const supabase = await createClient();

  // Fetch all Q&A questions for this problem set
  const { data: questions } = await supabase
    .from("qa_questions")
    .select(
      "id, title, body, pinned, question_id, created_at, updated_at, user_id"
    )
    .eq("problem_set_id", problemSetId)
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false });

  // Collect unique user IDs to fetch profiles
  const userIds = [...new Set((questions ?? []).map((q) => q.user_id))];

  const { data: profiles } =
    userIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, display_name, avatar_url")
          .in("id", userIds)
      : { data: [] };

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  // Fetch answer counts, accepted-answer flags, and upvote counts per question
  const questionIds = (questions ?? []).map((q) => q.id);

  const { data: answers } =
    questionIds.length > 0
      ? await supabase
          .from("qa_answers")
          .select("id, qa_question_id, is_accepted, upvotes")
          .in("qa_question_id", questionIds)
      : { data: [] };

  // Build per-question answer stats
  const answerCountMap = new Map<string, number>();
  const acceptedMap = new Map<string, boolean>();
  const upvoteCountMap = new Map<string, number>();

  for (const a of answers ?? []) {
    answerCountMap.set(
      a.qa_question_id,
      (answerCountMap.get(a.qa_question_id) ?? 0) + 1
    );
    if (a.is_accepted) {
      acceptedMap.set(a.qa_question_id, true);
    }
    upvoteCountMap.set(
      a.qa_question_id,
      (upvoteCountMap.get(a.qa_question_id) ?? 0) + (a.upvotes ?? 0)
    );
  }

  // Assemble serializable data for client components
  const questionData: QaQuestionData[] = (questions ?? []).map((q) => {
    const profile = profileMap.get(q.user_id);
    return {
      id: q.id,
      title: q.title,
      body: q.body,
      pinned: q.pinned,
      question_id: q.question_id,
      created_at: q.created_at,
      updated_at: q.updated_at,
      user: {
        id: q.user_id,
        display_name: profile?.display_name ?? null,
        avatar_url: profile?.avatar_url ?? null,
      },
      answer_count: answerCountMap.get(q.id) ?? 0,
      upvote_count: upvoteCountMap.get(q.id) ?? 0,
      has_accepted_answer: acceptedMap.get(q.id) ?? false,
    };
  });

  const totalQuestions = questionData.length;
  const isSeller = userId === sellerId;

  // Check if user has purchased (only purchasers can ask questions)
  let hasPurchased = false;
  if (userId) {
    const { data: purchase } = await supabase
      .from("purchases")
      .select("id")
      .eq("user_id", userId)
      .eq("problem_set_id", problemSetId)
      .maybeSingle();
    hasPurchased = !!purchase;
  }

  const canAsk = !!userId && (hasPurchased || isSeller);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircleQuestion className="h-5 w-5 text-primary" />
            <h2 className="font-display text-base font-semibold leading-none tracking-tight">
              Q&A
            </h2>
            {totalQuestions > 0 && (
              <span className="text-sm text-muted-foreground">
                ({totalQuestions})
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Question form -- visible to purchasers and seller */}
        {canAsk ? (
          <>
            <QaQuestionForm problemSetId={problemSetId} />
            {totalQuestions > 0 && <Separator />}
          </>
        ) : userId && !hasPurchased ? (
          <p className="text-center text-sm text-muted-foreground">
            質問を投稿するにはこの問題セットを購入する必要があります。
          </p>
        ) : null}

        {/* Question list */}
        <QaQuestionList
          questions={questionData}
          problemSetId={problemSetId}
          sellerId={sellerId}
          userId={userId}
          isSeller={isSeller}
        />
      </CardContent>
    </Card>
  );
}
