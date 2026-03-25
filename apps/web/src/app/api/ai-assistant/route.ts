import { NextResponse } from "next/server";
import { streamText, type UIMessage, convertToModelMessages } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getSubscriptionState } from "@/lib/subscription";
import { canAffordAiCall, recordTokenUsage } from "@/lib/ai/usage-manager";
import { rateLimitByUser } from "@/lib/rate-limit";

const DAILY_MESSAGE_LIMIT = 50;

// Zod schema for request body validation
const aiAssistantSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant", "system"]),
        content: z.string().min(1).max(10000),
      })
    )
    .min(1)
    .max(100),
  problemSetId: z.string().uuid().optional(),
});

const SYSTEM_PROMPT = `You are a study assistant for Japanese university entrance exam preparation.
Help the student understand the problem and guide them toward the answer WITHOUT giving the answer directly.
Provide hints, explain concepts, and suggest approaches.

Rules:
- Never reveal the full answer directly. Instead, guide the student step by step.
- Use the Socratic method: ask leading questions to help the student discover the answer themselves.
- If the student is stuck, provide a hint rather than the solution.
- Explain underlying concepts and formulas when relevant.
- When a problem context is provided, reference it specifically.
- Be encouraging and supportive.
- Respond in Japanese.`;

function buildSystemPrompt(problemContext: string | null): string {
  if (!problemContext) {
    return SYSTEM_PROMPT;
  }

  return `${SYSTEM_PROMPT}

The student is working on the following problem set:
${problemContext}

Reference this problem context when helping the student.`;
}

async function getDailyMessageCount(userId: string): Promise<number> {
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const adminSupabase = createAdminClient();

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const { count } = await adminSupabase
    .from("token_usage")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("model", "gemini-2.0-flash-assistant")
    .gte("created_at", startOfDay.toISOString());

  return count ?? 0;
}

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: 10 messages per minute per user (burst protection)
  const rateLimitResult = await rateLimitByUser(user.id, 10, 60_000);
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: "リクエストが多すぎます。しばらくお待ちください。" },
      { status: 429 }
    );
  }

  // Subscription tier check: Pro only
  const subState = await getSubscriptionState(user.id);
  if (subState.tier !== "pro" || !subState.isActive) {
    return NextResponse.json(
      {
        error: "AI学習アシスタントはProプラン限定の機能です。",
        code: "PRO_REQUIRED",
      },
      { status: 403 }
    );
  }

  // Daily message limit check
  const dailyCount = await getDailyMessageCount(user.id);
  if (dailyCount >= DAILY_MESSAGE_LIMIT) {
    return NextResponse.json(
      {
        error:
          "本日のAIアシスタント利用回数の上限に達しました。明日もう一度お試しください。",
        code: "DAILY_LIMIT_REACHED",
        used: dailyCount,
        limit: DAILY_MESSAGE_LIMIT,
      },
      { status: 429 }
    );
  }

  // Check AI cost budget before executing
  const budgetCheck = await canAffordAiCall(user.id);
  if (!budgetCheck.allowed) {
    return NextResponse.json(
      {
        error:
          "今月のAIコスト上限に達しました。来月の更新までお待ちいただくか、プランをアップグレードしてください。",
        code: "COST_BUDGET_EXCEEDED",
        budgetUsedJpy: Math.round(budgetCheck.budget.costSpentJpy),
        budgetLimitJpy: budgetCheck.budget.monthlyBudgetJpy,
      },
      { status: 429 }
    );
  }

  // Parse and validate request body with Zod
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const parsed = aiAssistantSchema.safeParse(rawBody);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Validation failed";
    return NextResponse.json({ error: firstError }, { status: 400 });
  }

  const { messages, problemSetId } = parsed.data;

  // Convert validated messages to model messages for streamText
  // Cast is safe: Zod validated the structure; UIMessage shape is a superset accepted by convertToModelMessages
  const modelMessages = await convertToModelMessages(messages as unknown as UIMessage[]);

  // Fetch problem set context if provided
  let problemContext: string | null = null;
  if (problemSetId) {
    const { data: problemSet } = await supabase
      .from("problem_sets")
      .select("title, subject, university, difficulty, description")
      .eq("id", problemSetId)
      .single();

    if (problemSet) {
      problemContext = [
        `Title: ${problemSet.title}`,
        `Subject: ${problemSet.subject}`,
        problemSet.university ? `University: ${problemSet.university}` : null,
        `Difficulty: ${problemSet.difficulty}`,
        problemSet.description
          ? `Description: ${problemSet.description}`
          : null,
      ]
        .filter(Boolean)
        .join("\n");
    }
  }

  const result = streamText({
    model: google("gemini-2.0-flash"),
    system: buildSystemPrompt(problemContext),
    messages: modelMessages,
    maxOutputTokens: 2048,
    temperature: 0.7,
    onFinish: async ({ usage }) => {
      // Track token usage with actual cost calculation (fixes cost_usd: 0 bug)
      const totalTokens =
        (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0);

      await recordTokenUsage({
        userId: user.id,
        tokensUsed: totalTokens,
        model: "gemini-2.0-flash-assistant",
      });
    },
  });

  return result.toUIMessageStreamResponse();
}
