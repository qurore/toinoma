import Link from "next/link";
import { requireSellerTos } from "@/lib/auth/require-seller";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  Receipt,
  Ticket,
} from "lucide-react";
import { getTransactions } from "./actions";
import { TransactionFilters } from "./transaction-filters";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "取引履歴 - 問の間",
};

export default async function SellerTransactionsPage(props: {
  searchParams: Promise<{
    start?: string;
    end?: string;
    page?: string;
  }>;
}) {
  const { user } = await requireSellerTos();
  const searchParams = await props.searchParams;

  const startDate = searchParams.start ?? "";
  const endDate = searchParams.end ?? "";
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10));

  const result = await getTransactions(
    user.id,
    startDate || null,
    endDate || null,
    page
  );

  const { transactions, summary, total_count, total_pages } = result;

  // Build pagination URLs
  function buildPageUrl(p: number): string {
    const params = new URLSearchParams();
    if (startDate) params.set("start", startDate);
    if (endDate) params.set("end", endDate);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return `/sell/transactions${qs ? `?${qs}` : ""}`;
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">取引履歴</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          問題セットの売上と手数料の詳細を確認できます
        </p>
      </div>

      {/* Summary cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              総売上
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              ¥{summary.total_revenue.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              プラットフォーム手数料
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-muted-foreground">
              -¥{summary.total_fees.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              手取り金額
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-success">
              ¥{summary.net_earnings.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              取引件数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {summary.total_transactions.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="py-4">
          <TransactionFilters
            sellerId={user.id}
            startDate={startDate}
            endDate={endDate}
          />
        </CardContent>
      </Card>

      {/* Transaction table */}
      {transactions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Receipt className="h-6 w-6 text-foreground/60" />
            </div>
            <p className="mb-2 text-lg font-medium">
              取引がありません
            </p>
            <p className="text-sm text-muted-foreground">
              {startDate || endDate
                ? "指定した期間に取引がありません。期間を変更してお試しください。"
                : "問題セットが購入されると、ここに取引履歴が表示されます。"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="px-4 py-3 font-medium">日付</th>
                    <th className="px-4 py-3 font-medium">購入者</th>
                    <th className="px-4 py-3 font-medium">問題セット</th>
                    <th className="px-4 py-3 text-right font-medium">売上</th>
                    <th className="px-4 py-3 text-right font-medium">手数料</th>
                    <th className="px-4 py-3 text-right font-medium">手取り</th>
                    <th className="px-4 py-3 text-center font-medium">クーポン</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {transactions.map((tx) => (
                    <tr
                      key={tx.id}
                      className="transition-colors hover:bg-muted/50"
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                        {new Date(tx.date).toLocaleDateString("ja-JP", {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-medium">
                          {tx.buyer_initial}
                        </span>
                      </td>
                      <td className="max-w-[200px] truncate px-4 py-3 font-medium">
                        <Link
                          href={`/sell/${tx.problem_set_id}/edit`}
                          className="hover:underline"
                        >
                          {tx.problem_set_title}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        ¥{tx.amount_paid.toLocaleString()}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-muted-foreground">
                        -¥{tx.platform_fee.toLocaleString()}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-success">
                        ¥{tx.net_revenue.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {tx.coupon_code ? (
                          <Badge variant="secondary" className="gap-1">
                            <Ticket className="h-3 w-3" />
                            {tx.coupon_code}
                            {tx.discount_amount > 0 && (
                              <span className="text-xs">
                                (-¥{tx.discount_amount.toLocaleString()})
                              </span>
                            )}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>

          {/* Pagination */}
          {total_pages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-sm text-muted-foreground">
                {total_count.toLocaleString()} 件中{" "}
                {((page - 1) * 20 + 1).toLocaleString()}-
                {Math.min(page * 20, total_count).toLocaleString()} 件を表示
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  disabled={page <= 1}
                >
                  <Link
                    href={buildPageUrl(page - 1)}
                    aria-disabled={page <= 1}
                    className={
                      page <= 1
                        ? "pointer-events-none opacity-50"
                        : undefined
                    }
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Link>
                </Button>
                <span className="px-3 text-sm text-muted-foreground">
                  {page} / {total_pages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  disabled={page >= total_pages}
                >
                  <Link
                    href={buildPageUrl(page + 1)}
                    aria-disabled={page >= total_pages}
                    className={
                      page >= total_pages
                        ? "pointer-events-none opacity-50"
                        : undefined
                    }
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}
    </main>
  );
}
