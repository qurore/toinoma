import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AppNavbar, getNavbarData } from "@/components/navigation/app-navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "通知 - 問の間",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fromUntyped(supabase: SupabaseClient<any>, table: string) {
  return supabase.from(table);
}

const TYPE_LABELS: Record<string, string> = {
  purchase: "購入",
  grading: "採点",
  review: "レビュー",
  announcement: "お知らせ",
  subscription: "サブスク",
  system: "システム",
};

export default async function NotificationsPage() {
  const supabase = await createClient();
  const navbarData = await getNavbarData();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: notifications } = await fromUntyped(supabase, "notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const allNotifs = (notifications ?? []) as Array<{
    id: string;
    type: string;
    title: string;
    body: string;
    link: string | null;
    read_at: string | null;
    created_at: string;
  }>;

  return (
    <>
      <AppNavbar {...navbarData} />
      <main className="container mx-auto max-w-2xl px-4 py-8 pt-20">
        <h1 className="mb-6 text-2xl font-bold tracking-tight">通知</h1>

        {allNotifs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              通知はありません
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {allNotifs.map((n) => (
              <Card
                key={n.id}
                className={n.read_at ? "opacity-60" : ""}
              >
                <CardContent className="flex items-start gap-3 p-4">
                  {!n.read_at && (
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{n.title}</p>
                      <Badge variant="outline" className="text-xs">
                        {TYPE_LABELS[n.type] ?? n.type}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {n.body}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(n.created_at).toLocaleString("ja-JP")}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
