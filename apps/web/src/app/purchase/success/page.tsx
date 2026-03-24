import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CheckCircle2,
  BookOpen,
  Printer,
  FolderPlus,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { AppNavbar, getNavbarData } from "@/components/navigation/app-navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SUBJECT_LABELS, DIFFICULTY_LABELS } from "@toinoma/shared/constants";
import type { Subject, Difficulty } from "@/types/database";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "購入完了 | 問の間",
};

interface ProblemSetInfo {
  title: string;
  subject: string;
  difficulty: string;
  total_points: number | null;
  time_limit_minutes: number | null;
  seller_display_name: string | null;
}

export default async function PurchaseSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{
    problem_set_id?: string;
    session_id?: string;
  }>;
}) {
  const [navbarData, supabase] = await Promise.all([
    getNavbarData(),
    createClient(),
  ]);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const params = await searchParams;
  const problemSetId = params.problem_set_id;
  const sessionId = params.session_id;

  // ── Verify Stripe session if provided ──────────────────────────
  let stripeVerified = false;
  let amountPaid: number | null = null;

  if (sessionId) {
    try {
      const stripe = getStripe();
      const session = await stripe.checkout.sessions.retrieve(sessionId);

      // Verify this session belongs to the current user
      if (
        session.status === "complete" &&
        (session.metadata?.user_id === user.id ||
          session.customer_email === user.email)
      ) {
        stripeVerified = true;
        amountPaid = session.amount_total;
      }
    } catch {
      // Session retrieval failed — show page anyway with basic info
      console.warn("[purchase-success] Failed to verify Stripe session:", sessionId);
    }
  }

  // ── Fetch problem set info ─────────────────────────────────────
  let problemSet: ProblemSetInfo | null = null;

  if (problemSetId) {
    const { data: ps } = await supabase
      .from("problem_sets")
      .select(
        "title, subject, difficulty, total_points, time_limit_minutes, seller_id"
      )
      .eq("id", problemSetId)
      .single();

    if (ps) {
      // Fetch seller display name
      const { data: seller } = await supabase
        .from("seller_profiles")
        .select("seller_display_name")
        .eq("id", ps.seller_id)
        .single();

      problemSet = {
        title: ps.title,
        subject: ps.subject,
        difficulty: ps.difficulty,
        total_points: ps.total_points,
        time_limit_minutes: ps.time_limit_minutes,
        seller_display_name: seller?.seller_display_name ?? null,
      };
    }
  }

  return (
    <>
      <AppNavbar {...navbarData} />
      <main className="flex min-h-screen items-center justify-center px-4 pb-20 pt-14">
        <div className="w-full max-w-lg">
          {/* Success card */}
          <Card className="overflow-hidden">
            {/* Green accent top bar */}
            <div className="h-1.5 bg-gradient-to-r from-primary to-green-light" />

            <CardContent className="px-8 pb-8 pt-10 text-center">
              {/* Success icon with pulse animation */}
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-success/10">
                <CheckCircle2 className="h-10 w-10 text-success animate-in zoom-in-50 duration-500" />
              </div>

              <h1 className="mb-2 text-2xl font-bold tracking-tight">
                購入完了
              </h1>

              {problemSet ? (
                <div className="mb-6">
                  <p className="text-base font-medium text-foreground">
                    {problemSet.title}
                  </p>

                  {/* Metadata badges */}
                  <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {SUBJECT_LABELS[problemSet.subject as Subject]}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {DIFFICULTY_LABELS[problemSet.difficulty as Difficulty]}
                    </Badge>
                    {problemSet.total_points && (
                      <Badge variant="outline" className="text-xs">
                        {problemSet.total_points}点満点
                      </Badge>
                    )}
                    {problemSet.time_limit_minutes && (
                      <Badge variant="outline" className="text-xs">
                        {problemSet.time_limit_minutes}分
                      </Badge>
                    )}
                  </div>

                  {/* Seller credit */}
                  {problemSet.seller_display_name && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      作成: {problemSet.seller_display_name}
                    </p>
                  )}

                  {/* Amount paid */}
                  {amountPaid != null && amountPaid > 0 && stripeVerified && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      お支払い金額: ¥{amountPaid.toLocaleString()}
                    </p>
                  )}

                  <p className="mt-3 text-sm text-muted-foreground">
                    ご購入ありがとうございます。今すぐ学習を始めましょう！
                  </p>
                </div>
              ) : (
                <p className="mb-6 text-sm text-muted-foreground">
                  ご購入ありがとうございます！
                </p>
              )}

              {/* Primary CTA */}
              {problemSetId && (
                <Button size="lg" className="mb-4 w-full" asChild>
                  <Link href={`/problem/${problemSetId}/solve`}>
                    <BookOpen className="mr-2 h-4 w-4" />
                    今すぐ解答する
                  </Link>
                </Button>
              )}

              {/* Secondary actions */}
              {problemSetId && (
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link
                      href={`/problem/${problemSetId}/print?mode=problems`}
                    >
                      <Printer className="mr-1.5 h-3.5 w-3.5" />
                      印刷する
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/dashboard/collections">
                      <FolderPlus className="mr-1.5 h-3.5 w-3.5" />
                      コレクションへ
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Next steps */}
          <div className="mt-6 space-y-2">
            <p className="text-center text-xs font-medium text-muted-foreground">
              次のステップ
            </p>
            <div className="space-y-1.5">
              {problemSetId && (
                <Link
                  href={`/problem/${problemSetId}`}
                  className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-sm transition-colors hover:bg-muted/50"
                >
                  <span className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    問題セットの詳細を見る
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              )}
              <Link
                href="/dashboard"
                className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-sm transition-colors hover:bg-muted/50"
              >
                <span>マイページで学習状況を確認</span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Link>
              <Link
                href="/explore"
                className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-sm transition-colors hover:bg-muted/50"
              >
                <span>他の問題セットを探す</span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
