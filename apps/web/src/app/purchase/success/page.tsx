import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "購入完了 - 問の間",
};

export default async function PurchaseSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ problem_set_id?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const params = await searchParams;
  const problemSetId = params.problem_set_id;

  let problemSetTitle = "問題セット";
  if (problemSetId) {
    const { data: ps } = await supabase
      .from("problem_sets")
      .select("title")
      .eq("id", problemSetId)
      .single();
    if (ps) problemSetTitle = ps.title;
  }

  return (
    <main className="container mx-auto flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardContent className="pt-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
            <CheckCircle2 className="h-8 w-8 text-success" />
          </div>
          <h1 className="mb-2 text-xl font-bold tracking-tight">
            購入完了
          </h1>
          <p className="mb-1 text-sm text-foreground/80">
            {problemSetTitle}
          </p>
          <p className="mb-6 text-sm text-muted-foreground">
            をご購入いただきありがとうございます！
          </p>
          <div className="flex flex-col gap-2">
            {problemSetId && (
              <Button asChild>
                <Link href={`/problem/${problemSetId}/solve`}>
                  今すぐ解く
                </Link>
              </Button>
            )}
            <Button variant="outline" asChild>
              <Link href="/dashboard">マイページへ</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
