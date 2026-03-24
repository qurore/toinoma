import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "特定商取引法に基づく表記 - 問の間",
  description: "問の間の特定商取引法に基づく表記です。",
};

export default function TokushohoPage() {
  return (
    <article>
      <h1>特定商取引法に基づく表記</h1>
      <p className="text-sm text-muted-foreground">
        最終更新日: 2026年3月23日
      </p>

      <p>
        「特定商取引に関する法律」第11条に基づき、以下のとおり表記いたします。
      </p>

      <div className="overflow-x-auto">
      <table className="w-full">
        <tbody>
          <tr>
            <th className="w-1/3 border px-4 py-3 text-left align-top font-medium">
              事業者名
            </th>
            <td className="border px-4 py-3">問の間運営</td>
          </tr>
          <tr>
            <th className="border px-4 py-3 text-left align-top font-medium">
              代表者
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
                お問い合わせはメールにてお願いいたします
              </span>
            </td>
          </tr>
          <tr>
            <th className="border px-4 py-3 text-left align-top font-medium">
              メールアドレス
            </th>
            <td className="border px-4 py-3">
              support@toinoma.jp
            </td>
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
              販売価格
            </th>
            <td className="border px-4 py-3">
              <strong>問題セット:</strong>{" "}
              各問題セットのページに表示された価格（税込）。無料〜出品者が設定する価格
              <br />
              <br />
              <strong>サブスクリプション:</strong>
              <br />
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
              インターネット接続に必要な通信料等はお客様のご負担となります
            </td>
          </tr>
          <tr>
            <th className="border px-4 py-3 text-left align-top font-medium">
              支払方法
            </th>
            <td className="border px-4 py-3">
              クレジットカード（Visa, Mastercard, American
              Express, JCB）
              <br />
              決済処理はStripe, Inc.が行います
            </td>
          </tr>
          <tr>
            <th className="border px-4 py-3 text-left align-top font-medium">
              支払時期
            </th>
            <td className="border px-4 py-3">
              <strong>問題セット購入:</strong>{" "}
              購入時に即時決済
              <br />
              <strong>サブスクリプション:</strong>{" "}
              契約時および毎月（または毎年）の更新時に自動決済
            </td>
          </tr>
          <tr>
            <th className="border px-4 py-3 text-left align-top font-medium">
              商品の引渡時期
            </th>
            <td className="border px-4 py-3">
              決済完了後、即時にデジタルコンテンツへのアクセスが可能となります
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
              サブスクリプションはいつでも解約可能ですが、当該請求期間の終了まで機能をご利用いただけます。日割り返金は行いません。
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
              <strong>対応ブラウザ:</strong> Chrome,
              Safari, Firefox（いずれも最新2バージョン）
              <br />
              <strong>対応デバイス:</strong> PC,
              スマートフォン,
              タブレット（画面幅375px以上）
              <br />
              <strong>通信環境:</strong>{" "}
              インターネット接続が必要です
              <br />
              <strong>AI採点機能:</strong>{" "}
              回答提出時にインターネット接続が必要です。採点完了まで最大30秒かかる場合があります。
            </td>
          </tr>
          <tr>
            <th className="border px-4 py-3 text-left align-top font-medium">
              プラットフォーム手数料
            </th>
            <td className="border px-4 py-3">
              出品者の売上に対して15%のプラットフォーム手数料が適用されます。
              <br />
              決済手数料（3.6% +
              ¥40）はプラットフォームが負担します。
              <br />
              <span className="text-sm text-muted-foreground">
                出品者への振込はStripe
                Connectを通じて行われます
              </span>
            </td>
          </tr>
          <tr>
            <th className="border px-4 py-3 text-left align-top font-medium">
              ソフトウェアの動作についての特記事項
            </th>
            <td className="border px-4 py-3">
              AI採点機能による採点結果は参考スコアであり、実際の大学入試の採点結果を保証するものではありません。
            </td>
          </tr>
        </tbody>
      </table>
      </div>

      <hr />
      <p className="text-sm text-muted-foreground">
        制定日: 2026年1月1日
        <br />
        最終改定日: 2026年3月23日
      </p>
    </article>
  );
}
