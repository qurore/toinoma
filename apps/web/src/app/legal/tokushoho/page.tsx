import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "特定商取引法に基づく表記 - 問の間",
  description: "問の間の特定商取引法に基づく表記です。",
};

export default function TokushohoPage() {
  return (
    <article>
      <h1>特定商取引法に基づく表記</h1>
      <p className="text-sm text-muted-foreground">最終更新日: 2026年3月23日</p>

      <table className="w-full">
        <tbody>
          <tr>
            <th className="w-1/3 border px-4 py-2 text-left align-top font-medium">
              事業者名
            </th>
            <td className="border px-4 py-2">問の間運営</td>
          </tr>
          <tr>
            <th className="border px-4 py-2 text-left align-top font-medium">
              代表者
            </th>
            <td className="border px-4 py-2">
              請求があった場合、遅滞なく開示いたします
            </td>
          </tr>
          <tr>
            <th className="border px-4 py-2 text-left align-top font-medium">
              所在地
            </th>
            <td className="border px-4 py-2">
              請求があった場合、遅滞なく開示いたします
            </td>
          </tr>
          <tr>
            <th className="border px-4 py-2 text-left align-top font-medium">
              連絡先
            </th>
            <td className="border px-4 py-2">
              メール: support@toinoma.jp<br />
              お問い合わせフォームよりご連絡ください
            </td>
          </tr>
          <tr>
            <th className="border px-4 py-2 text-left align-top font-medium">
              販売価格
            </th>
            <td className="border px-4 py-2">
              各問題セットのページに表示された価格（税込）<br />
              サブスクリプション: フリー（¥0）、ベーシック（月額¥500 / 年額¥4,000）、プロ（月額¥2,000 / 年額¥15,000）
            </td>
          </tr>
          <tr>
            <th className="border px-4 py-2 text-left align-top font-medium">
              販売価格以外の必要料金
            </th>
            <td className="border px-4 py-2">
              インターネット接続に必要な通信料等はお客様のご負担となります
            </td>
          </tr>
          <tr>
            <th className="border px-4 py-2 text-left align-top font-medium">
              支払方法
            </th>
            <td className="border px-4 py-2">
              クレジットカード（Visa, Mastercard, American Express, JCB）<br />
              決済処理はStripe, Inc.が行います
            </td>
          </tr>
          <tr>
            <th className="border px-4 py-2 text-left align-top font-medium">
              支払時期
            </th>
            <td className="border px-4 py-2">
              問題セット購入: 購入時に即時決済<br />
              サブスクリプション: 契約時および更新時に自動決済
            </td>
          </tr>
          <tr>
            <th className="border px-4 py-2 text-left align-top font-medium">
              商品の引渡時期
            </th>
            <td className="border px-4 py-2">
              決済完了後、即時にデジタルコンテンツへのアクセスが可能となります
            </td>
          </tr>
          <tr>
            <th className="border px-4 py-2 text-left align-top font-medium">
              返品・キャンセル
            </th>
            <td className="border px-4 py-2">
              デジタルコンテンツの性質上、購入後の返品はお受けできません。<br />
              ただし、購入後24時間以内かつ未利用（回答未提出）の場合に限り、返金対応いたします。<br />
              サブスクリプションはいつでも解約可能ですが、当該請求期間の終了まで機能をご利用いただけます。<br />
              詳細は<a href="/legal/refund">返金ポリシー</a>をご確認ください。
            </td>
          </tr>
          <tr>
            <th className="border px-4 py-2 text-left align-top font-medium">
              動作環境
            </th>
            <td className="border px-4 py-2">
              対応ブラウザ: Chrome, Safari, Firefox（いずれも最新2バージョン）<br />
              対応デバイス: PC, スマートフォン, タブレット（画面幅375px以上）<br />
              インターネット接続が必要です
            </td>
          </tr>
          <tr>
            <th className="border px-4 py-2 text-left align-top font-medium">
              プラットフォーム手数料
            </th>
            <td className="border px-4 py-2">
              出品者の売上に対して15%のプラットフォーム手数料が適用されます。<br />
              決済手数料（3.6% + ¥40）はプラットフォームが負担します。
            </td>
          </tr>
        </tbody>
      </table>
    </article>
  );
}
