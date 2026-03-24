import Link from "next/link";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";

export const metadata: Metadata = {
  title: "特定商取引法に基づく表記",
  description: "問の間の特定商取引法に基づく表記です。",
};

export default function TokushohoPage() {
  return (
    <article>
      <Breadcrumbs
        items={[
          { label: "ホーム", href: "/" },
          { label: "法的情報", href: "/legal" },
          { label: "特定商取引法に基づく表記" },
        ]}
      />
      <h1>特定商取引法に基づく表記</h1>
      <p className="text-sm text-muted-foreground">
        最終更新日: 2026年3月24日
      </p>

      <p>
        「特定商取引に関する法律」第11条に基づき、以下のとおり表記いたします。本サービスでは、(1)
        当社が直接販売するサブスクリプションサービス、および (2)
        出品者がマーケットプレイスを通じて販売する問題セットの2種類の取引が存在するため、それぞれについて表記いたします。
      </p>

      {/* ── Section 1: Platform subscription ────────────────────────── */}
      <h2 id="section-subscription">
        1. サブスクリプションサービスに関する表記
      </h2>
      <p className="text-sm text-muted-foreground">
        当社（問の間運営）が販売するサブスクリプションサービスについて
      </p>

      <div className="overflow-x-auto">
        <table className="w-full">
          <tbody>
            <tr>
              <th className="w-1/3 border px-4 py-3 text-left align-top font-medium">
                販売業者
              </th>
              <td className="border px-4 py-3">問の間運営</td>
            </tr>
            <tr>
              <th className="border px-4 py-3 text-left align-top font-medium">
                運営統括責任者
              </th>
              <td className="border px-4 py-3">
                請求があった場合、遅滞なく開示いたします
              </td>
            </tr>
            <tr>
              <th className="border px-4 py-3 text-left align-top font-medium">
                所在地
              </th>
              <td className="border px-4 py-3">
                請求があった場合、遅滞なく開示いたします
              </td>
            </tr>
            <tr>
              <th className="border px-4 py-3 text-left align-top font-medium">
                電話番号
              </th>
              <td className="border px-4 py-3">
                請求があった場合、遅滞なく開示いたします
                <br />
                <span className="text-sm text-muted-foreground">
                  お問い合わせはメール（support@toinoma.jp）にてお願いいたします
                </span>
              </td>
            </tr>
            <tr>
              <th className="border px-4 py-3 text-left align-top font-medium">
                メールアドレス
              </th>
              <td className="border px-4 py-3">support@toinoma.jp</td>
            </tr>
            <tr>
              <th className="border px-4 py-3 text-left align-top font-medium">
                URL
              </th>
              <td className="border px-4 py-3">
                <a
                  href="https://toinoma.jp"
                  className="text-primary hover:underline"
                >
                  https://toinoma.jp
                </a>
              </td>
            </tr>
            <tr>
              <th className="border px-4 py-3 text-left align-top font-medium">
                商品の名称
              </th>
              <td className="border px-4 py-3">
                問の間 サブスクリプションサービス（ベーシックプラン、プロプラン）
              </td>
            </tr>
            <tr>
              <th className="border px-4 py-3 text-left align-top font-medium">
                販売価格（税込）
              </th>
              <td className="border px-4 py-3">
                フリープラン: ¥0
                <br />
                ベーシックプラン: 月額¥498 / 年額¥4,980
                <br />
                プロプラン: 月額¥1,980 / 年額¥17,980
              </td>
            </tr>
            <tr>
              <th className="border px-4 py-3 text-left align-top font-medium">
                販売価格以外の必要料金
              </th>
              <td className="border px-4 py-3">
                インターネット接続に必要な通信料等はお客様のご負担となります。その他、本サービスの利用に関して追加料金は発生しません。
              </td>
            </tr>
            <tr>
              <th className="border px-4 py-3 text-left align-top font-medium">
                支払方法
              </th>
              <td className="border px-4 py-3">
                クレジットカード（Visa, Mastercard, American Express, JCB）
                <br />
                <span className="text-sm text-muted-foreground">
                  決済処理はStripe, Inc.が行います
                </span>
              </td>
            </tr>
            <tr>
              <th className="border px-4 py-3 text-left align-top font-medium">
                支払時期
              </th>
              <td className="border px-4 py-3">
                契約時に初回決済。以降、毎月（月額プラン）または毎年（年額プラン）の更新日に自動決済されます。
              </td>
            </tr>
            <tr>
              <th className="border px-4 py-3 text-left align-top font-medium">
                サービスの提供時期
              </th>
              <td className="border px-4 py-3">
                決済完了後、即時にサブスクリプション機能へのアクセスが可能となります。
              </td>
            </tr>
            <tr>
              <th className="border px-4 py-3 text-left align-top font-medium">
                契約期間
              </th>
              <td className="border px-4 py-3">
                月額プラン: 1ヶ月（自動更新）
                <br />
                年額プラン: 1年間（自動更新）
                <br />
                <span className="text-sm text-muted-foreground">
                  解約手続きを行わない限り、同一プランが自動的に更新されます。
                </span>
              </td>
            </tr>
            <tr>
              <th className="border px-4 py-3 text-left align-top font-medium">
                解約・返品
              </th>
              <td className="border px-4 py-3">
                サブスクリプションはいつでも設定画面から解約できます。解約後も当該請求期間の終了まで機能をご利用いただけます。日割り返金は行いません。
                <br />
                <br />
                初回購入後7日以内かつAI採点機能を一度も使用していない場合に限り、返金対応いたします。
                <br />
                <br />
                詳細は
                <Link
                  href="/legal/refund"
                  className="text-primary hover:underline"
                >
                  返金ポリシー
                </Link>
                をご確認ください。
              </td>
            </tr>
            <tr>
              <th className="border px-4 py-3 text-left align-top font-medium">
                動作環境
              </th>
              <td className="border px-4 py-3">
                <strong>対応ブラウザ:</strong> Chrome, Safari,
                Firefox（いずれも最新2バージョン）
                <br />
                <strong>対応デバイス:</strong> PC, スマートフォン,
                タブレット（画面幅375px以上）
                <br />
                <strong>通信環境:</strong> インターネット接続が必要です
              </td>
            </tr>
            <tr>
              <th className="border px-4 py-3 text-left align-top font-medium">
                特記事項
              </th>
              <td className="border px-4 py-3">
                AI採点機能による採点結果は参考スコアであり、実際の大学入試の採点結果を保証するものではありません。回答提出時にインターネット接続が必要です。採点完了まで最大30秒かかる場合があります。
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── Section 2: Marketplace transactions ────────────────────── */}
      <h2 id="section-marketplace">
        2. マーケットプレイス取引（問題セット売買）に関する表記
      </h2>
      <p className="text-sm text-muted-foreground">
        出品者がマーケットプレイスを通じて販売する問題セットについて
      </p>
      <p>
        問の間のマーケットプレイスにおける問題セットの売買は、出品者（売主）と購入者（買主）間の取引です。当社（問の間運営）はプラットフォーム提供者として取引の場を提供するものであり、売主の地位にはありません。ただし、特定商取引法の規定に基づき、以下のとおり表記いたします。
      </p>

      <div className="overflow-x-auto">
        <table className="w-full">
          <tbody>
            <tr>
              <th className="w-1/3 border px-4 py-3 text-left align-top font-medium">
                プラットフォーム運営者
              </th>
              <td className="border px-4 py-3">
                問の間運営
                <br />
                <span className="text-sm text-muted-foreground">
                  当社はプラットフォーム提供者であり、各問題セットの販売主体は出品者（個人）です。
                </span>
              </td>
            </tr>
            <tr>
              <th className="border px-4 py-3 text-left align-top font-medium">
                出品者（販売業者）
              </th>
              <td className="border px-4 py-3">
                各問題セットの詳細ページに表示される出品者名をご確認ください。
                <br />
                <span className="text-sm text-muted-foreground">
                  出品者は個人であり、販売業者には該当しない場合があります。出品者の詳細情報は、請求があった場合に遅滞なく開示いたします。
                </span>
              </td>
            </tr>
            <tr>
              <th className="border px-4 py-3 text-left align-top font-medium">
                連絡先
              </th>
              <td className="border px-4 py-3">
                出品者への問い合わせ: 各問題セットのページからお問い合わせいただけます。
                <br />
                プラットフォームへの問い合わせ: support@toinoma.jp
              </td>
            </tr>
            <tr>
              <th className="border px-4 py-3 text-left align-top font-medium">
                商品
              </th>
              <td className="border px-4 py-3">
                大学受験向けオリジナル問題セット（デジタルコンテンツ）
                <br />
                <span className="text-sm text-muted-foreground">
                  対応科目: 数学、英語、国語、物理、化学、生物、日本史、世界史、地理
                </span>
              </td>
            </tr>
            <tr>
              <th className="border px-4 py-3 text-left align-top font-medium">
                販売価格（税込）
              </th>
              <td className="border px-4 py-3">
                各問題セットのページに表示された価格をご確認ください。
                <br />
                価格帯: ¥0（無料）〜 ¥50,000
                <br />
                <span className="text-sm text-muted-foreground">
                  価格は出品者が設定します。表示価格はすべて税込です。
                </span>
              </td>
            </tr>
            <tr>
              <th className="border px-4 py-3 text-left align-top font-medium">
                販売価格以外の必要料金
              </th>
              <td className="border px-4 py-3">
                インターネット接続に必要な通信料等はお客様のご負担となります。
                <br />
                AI採点機能の利用にはサブスクリプション（フリープランで月3回まで無料）が必要です。
              </td>
            </tr>
            <tr>
              <th className="border px-4 py-3 text-left align-top font-medium">
                支払方法
              </th>
              <td className="border px-4 py-3">
                クレジットカード（Visa, Mastercard, American Express, JCB）
                <br />
                <span className="text-sm text-muted-foreground">
                  決済処理はStripe, Inc.が行います
                </span>
              </td>
            </tr>
            <tr>
              <th className="border px-4 py-3 text-left align-top font-medium">
                支払時期
              </th>
              <td className="border px-4 py-3">
                購入時に即時決済されます。
              </td>
            </tr>
            <tr>
              <th className="border px-4 py-3 text-left align-top font-medium">
                商品の引渡時期
              </th>
              <td className="border px-4 py-3">
                決済完了後、即時にデジタルコンテンツへのアクセスが可能となります。ダウンロードではなく、本サービス上での閲覧・回答形式での提供となります。
              </td>
            </tr>
            <tr>
              <th className="border px-4 py-3 text-left align-top font-medium">
                返品・キャンセル
              </th>
              <td className="border px-4 py-3">
                デジタルコンテンツの性質上、原則として購入後の返品はお受けできません。
                <br />
                <br />
                <strong>例外的な返金対象:</strong>
                <ul className="ml-4 mt-1 list-disc">
                  <li>
                    購入後24時間以内かつ未利用（回答未提出）の場合
                  </li>
                  <li>
                    技術的な問題によりコンテンツにアクセスできない場合
                  </li>
                  <li>
                    商品説明と著しく異なる内容であった場合
                  </li>
                </ul>
                <br />
                詳細は
                <Link
                  href="/legal/refund"
                  className="text-primary hover:underline"
                >
                  返金ポリシー
                </Link>
                をご確認ください。
              </td>
            </tr>
            <tr>
              <th className="border px-4 py-3 text-left align-top font-medium">
                プラットフォーム手数料
              </th>
              <td className="border px-4 py-3">
                出品者の売上に対して15%のプラットフォーム手数料が適用されます。
                <br />
                決済手数料（3.6% + ¥40/件）はプラットフォームが負担します。
                <br />
                <span className="text-sm text-muted-foreground">
                  出品者への振込はStripe Connectを通じて行われます。振込スケジュールはStripeの規定に従います。
                </span>
              </td>
            </tr>
            <tr>
              <th className="border px-4 py-3 text-left align-top font-medium">
                動作環境
              </th>
              <td className="border px-4 py-3">
                <strong>対応ブラウザ:</strong> Chrome, Safari,
                Firefox（いずれも最新2バージョン）
                <br />
                <strong>対応デバイス:</strong> PC, スマートフォン,
                タブレット（画面幅375px以上）
                <br />
                <strong>通信環境:</strong> インターネット接続が必要です
              </td>
            </tr>
            <tr>
              <th className="border px-4 py-3 text-left align-top font-medium">
                特記事項
              </th>
              <td className="border px-4 py-3">
                <ul className="ml-4 list-disc">
                  <li>
                    問題セットの内容に関する責任は出品者が負います。当社は内容の正確性を保証しません。
                  </li>
                  <li>
                    AI採点機能による採点結果は参考スコアであり、実際の大学入試の採点結果を保証するものではありません。
                  </li>
                  <li>
                    購入した問題セットは個人の学習目的にのみ利用でき、再配布・転売は禁止されています。
                  </li>
                </ul>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <hr />
      <p className="text-sm text-muted-foreground">
        制定日: 2026年1月1日
        <br />
        最終改定日: 2026年3月24日
      </p>
    </article>
  );
}
