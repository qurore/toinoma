import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CheckCircle2,
  BookOpen,
  PenLine,
  Printer,
  FolderPlus,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { AppNavbar, getNavbarData } from "@/components/navigation/app-navbar";
import { SiteFooter } from "@/components/navigation/site-footer";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SUBJECT_LABELS, DIFFICULTY_LABELS } from "@toinoma/shared/constants";
import type { Subject, Difficulty } from "@/types/database";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "購入完了 - 問の間",
};

interface ProblemSetInfo {
  title: string;
  subject: string;
  difficulty: string;
  total_points: number | null;
  time_limit_minutes: number | null;
  seller_display_name: string | null;
}

// Difficulty badge with semantic colors
const DIFFICULTY_STYLES: Record<string, string> = {
  easy: "bg-primary/5 text-primary border-primary/20",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  hard: "bg-red-50 text-red-700 border-red-200",
};

function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  const style = DIFFICULTY_STYLES[difficulty] ?? "bg-secondary text-secondary-foreground border-border";
  return (
    <Badge className={`border text-xs ${style}`}>
      {DIFFICULTY_LABELS[difficulty]}
    </Badge>
  );
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

  // ── Verify purchase exists in DB ──────────────────────────────
  // Prevents users from accessing the success page without a real purchase.
  // For paid purchases, the webhook may have a slight delay creating the
  // record, so we allow the page to render but flag it as unverified.
  let purchaseVerified = false;

  if (problemSetId) {
    const { data: purchase } = await supabase
      .from("purchases")
      .select("id")
      .eq("user_id", user.id)
      .eq("problem_set_id", problemSetId)
      .single();

    purchaseVerified = !!purchase;
  }

  // If no Stripe session and no purchase record, this is a bogus URL
  if (!stripeVerified && !purchaseVerified && problemSetId) {
    redirect(`/problem/${problemSetId}`);
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
        <Breadcrumbs
          items={[
            { label: "ホーム", href: "/" },
            { label: "購入完了" },
          ]}
          className="absolute left-4 top-16 sm:left-6"
        />
        <div className="w-full max-w-lg">
          {/* Success card */}
          <Card className="overflow-hidden shadow-lg">
            {/* Animated gradient top bar */}
            <div className="h-2 bg-gradient-to-r from-primary via-green-light to-primary bg-[length:200%_auto] animate-[gradient-slide_3s_linear_infinite]" />

            <CardContent className="px-8 pb-8 pt-10 text-center">
              {/* Success icon with celebration ring */}
              <div className="relative mx-auto mb-6 h-24 w-24">
                {/* Outer pulsing ring */}
                <div className="absolute inset-0 rounded-full bg-success/10 animate-in zoom-in-75 duration-700" />
                <div className="absolute inset-2 rounded-full bg-success/5" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <CheckCircle2 className="h-12 w-12 text-success animate-in zoom-in-50 duration-500" />
                </div>
              </div>

              <h1 className="mb-1 text-2xl font-bold tracking-tight">
                購入が完了しました
              </h1>
              <p className="mb-6 text-sm text-muted-foreground">
                問題セットの購入が完了しました！早速解いてみましょう。
              </p>

              {problemSet && (
                <div className="mb-6 rounded-lg bg-muted/50 p-4">
                  <p className="text-base font-semibold text-foreground">
                    {problemSet.title}
                  </p>

                  {/* Metadata badges */}
                  <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                    <Badge className="border border-border bg-secondary text-xs text-secondary-foreground">
                      {SUBJECT_LABELS[problemSet.subject as Subject]}
                    </Badge>
                    <DifficultyBadge difficulty={problemSet.difficulty as Difficulty} />
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
                    <p className="mt-2 text-sm font-medium text-foreground">
                      お支払い金額: ¥{amountPaid.toLocaleString()}
                    </p>
                  )}
                </div>
              )}

              {/* Primary CTA — large and prominent */}
              {problemSetId && (
                <Button size="lg" className="mb-4 w-full text-base font-bold shadow-md" asChild>
                  <Link href={`/problem/${problemSetId}/solve`}>
                    <PenLine className="mr-2 h-5 w-5" />
                    今すぐ解く
                  </Link>
                </Button>
              )}

              {/* Secondary actions */}
              {problemSetId && (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
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
          <div className="mt-8 space-y-3">
            <p className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              次のステップ
            </p>
            <div className="space-y-2">
              {problemSetId && (
                <Link
                  href={`/problem/${problemSetId}`}
                  className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3.5 text-sm transition-colors hover:border-primary/30 hover:bg-primary/5"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                      <Sparkles className="h-4 w-4 text-primary" />
                    </span>
                    問題セットの詳細を見る
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              )}
              <Link
                href="/dashboard"
                className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3.5 text-sm transition-colors hover:border-primary/30 hover:bg-primary/5"
              >
                <span className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                  </span>
                  マイページで学習状況を確認
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Link>
              <Link
                href="/explore"
                className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3.5 text-sm transition-colors hover:border-primary/30 hover:bg-primary/5"
              >
                <span className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                    <Sparkles className="h-4 w-4 text-muted-foreground" />
                  </span>
                  他の問題セットを探す
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
