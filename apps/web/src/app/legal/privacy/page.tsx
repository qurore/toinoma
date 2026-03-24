import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";

export const metadata: Metadata = {
  title: "プライバシーポリシー",
  description:
    "問の間のプライバシーポリシーです。個人情報の取扱いについてご確認ください。",
};

export default function PrivacyPage() {
  return (
    <article>
      <Breadcrumbs
        items={[
          { label: "ホーム", href: "/" },
          { label: "法的情報", href: "/legal" },
          { label: "プライバシーポリシー" },
        ]}
      />
      <h1>プライバシーポリシー</h1>
      <p className="text-sm text-muted-foreground">
        最終更新日: 2026年3月24日
      </p>

      <p>
        問の間運営（以下「当社」）は、ユーザーの個人情報の保護を重要な責務と認識し、個人情報の保護に関する法律（平成15年法律第57号。以下「個人情報保護法」）およびその他関連法令・ガイドラインを遵守いたします。本プライバシーポリシー（以下「本ポリシー」）は、当社が運営する「問の間」（toinoma.jp、以下「本サービス」）における個人情報の取扱いについて定めるものです。
      </p>

      {/* Table of contents */}
      <nav aria-label="目次" className="my-6 rounded-lg border p-4">
        <p className="mb-2 text-sm font-semibold">目次</p>
        <ol className="columns-2 gap-8 text-sm">
          <li>
            <a href="#privacy-1">第1条 個人情報取扱事業者</a>
          </li>
          <li>
            <a href="#privacy-2">第2条 収集する個人情報</a>
          </li>
          <li>
            <a href="#privacy-3">第3条 利用目的</a>
          </li>
          <li>
            <a href="#privacy-4">第4条 個人情報の第三者提供</a>
          </li>
          <li>
            <a href="#privacy-5">第5条 業務委託先への提供</a>
          </li>
          <li>
            <a href="#privacy-6">第6条 個人情報の安全管理措置</a>
          </li>
          <li>
            <a href="#privacy-7">第7条 データの保存期間</a>
          </li>
          <li>
            <a href="#privacy-8">第8条 保有個人データに関する請求</a>
          </li>
          <li>
            <a href="#privacy-9">第9条 Cookie・トラッキング技術</a>
          </li>
          <li>
            <a href="#privacy-10">第10条 アクセス解析</a>
          </li>
          <li>
            <a href="#privacy-11">第11条 未成年者の個人情報</a>
          </li>
          <li>
            <a href="#privacy-12">第12条 越境データ移転</a>
          </li>
          <li>
            <a href="#privacy-13">第13条 個人情報の匿名加工</a>
          </li>
          <li>
            <a href="#privacy-14">第14条 ポリシーの変更</a>
          </li>
          <li>
            <a href="#privacy-15">第15条 お問い合わせ窓口</a>
          </li>
        </ol>
      </nav>

      <h2 id="privacy-1">第1条（個人情報取扱事業者）</h2>
      <p>
        本サービスにおける個人情報取扱事業者は以下のとおりです。
      </p>
      <ul>
        <li>事業者名: 問の間運営</li>
        <li>所在地: 請求があった場合に遅滞なく開示いたします</li>
        <li>個人情報保護管理者: 代表者</li>
        <li>連絡先: support@toinoma.jp</li>
      </ul>

      <h2 id="privacy-2">第2条（収集する個人情報）</h2>
      <p>
        当社は、本サービスの提供にあたり、以下の個人情報を収集する場合があります。
      </p>

      <h3>2.1 ユーザーから直接取得する情報</h3>
      <ul>
        <li>表示名（ニックネーム）</li>
        <li>
          メールアドレス（OAuth認証プロバイダー（Google、X/Twitter）から取得）
        </li>
        <li>
          プロフィール画像（OAuth認証プロバイダーから取得、またはユーザーがアップロード）
        </li>
        <li>通知設定に関する情報</li>
      </ul>

      <h3>2.2 サービス利用に伴い自動的に収集する情報</h3>
      <ul>
        <li>
          学習履歴（回答内容、AI採点結果、提出日時、利用状況）
        </li>
        <li>問題セットの閲覧・購入・お気に入り履歴</li>
        <li>IPアドレス、ブラウザ情報（User-Agent）、利用端末情報</li>
        <li>アクセスログ（ページ遷移、滞在時間等）</li>
      </ul>

      <h3>2.3 出品者から追加で取得する情報</h3>
      <ul>
        <li>大学名、サークル名</li>
        <li>出品者としての表示名</li>
        <li>販売実績、売上情報</li>
      </ul>

      <h3>2.4 決済に関する情報</h3>
      <p>
        決済情報（クレジットカード番号等）はStripe, Inc.が直接収集・管理します。当社のサーバーにはカード番号・セキュリティコードは一切保存されません。当社が保持するのは、Stripeが発行する顧客ID、サブスクリプションID、決済ステータス等の参照情報のみです。
      </p>

      <h2 id="privacy-3">第3条（利用目的）</h2>
      <p>
        当社は、収集した個人情報を以下の目的の範囲内でのみ利用いたします（個人情報保護法第17条）。
      </p>
      <ol>
        <li>本サービスの提供、運営および維持管理</li>
        <li>ユーザーの本人確認およびアカウント管理</li>
        <li>問題セットの購入処理および決済</li>
        <li>AI採点機能の提供（回答データのAIモデルへの入力を含む）</li>
        <li>
          学習分析およびユーザーに適した問題セットの推薦
        </li>
        <li>お問い合わせへの回答およびカスタマーサポート</li>
        <li>サービスの改善、新機能の開発</li>
        <li>利用状況の統計分析（個人を特定しない形で）</li>
        <li>利用規約違反行為の調査、検知および対応</li>
        <li>不正利用の防止およびセキュリティの維持</li>
        <li>
          法令に基づく義務の履行（特定商取引法、消費者契約法、犯罪収益移転防止法等）
        </li>
        <li>
          重要なサービス変更、メンテナンス等に関する通知
        </li>
      </ol>
      <p>
        当社は、上記の利用目的を変更する場合、変更後の目的を本ポリシーに掲載し、ユーザーに通知いたします。
      </p>

      <h2 id="privacy-4">第4条（個人情報の第三者提供）</h2>
      <p>
        当社は、以下の場合を除き、ユーザーの同意なく個人情報を第三者に提供いたしません（個人情報保護法第27条）。
      </p>
      <ol>
        <li>法令に基づく場合（裁判所、警察等からの法的要請を含む）</li>
        <li>
          人の生命、身体または財産の保護のために必要がある場合であって、本人の同意を得ることが困難であるとき
        </li>
        <li>
          公衆衛生の向上または児童の健全な育成の推進のために特に必要がある場合であって、本人の同意を得ることが困難であるとき
        </li>
        <li>
          国の機関もしくは地方公共団体またはその委託を受けた者が法令の定める事務を遂行することに対して協力する必要がある場合
        </li>
        <li>
          合併、分社化、事業譲渡その他の事由による事業承継に伴い個人情報を提供する場合
        </li>
      </ol>

      <h2 id="privacy-5">第5条（業務委託先への提供）</h2>
      <p>
        当社は、利用目的の達成に必要な範囲内で、以下の事業者にサービスの一部を委託しています（個人情報保護法第25条）。各委託先とは適切なデータ処理契約を締結し、個人情報の安全管理を確保しています。
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="border px-3 py-2 text-left font-medium">委託先</th>
              <th className="border px-3 py-2 text-left font-medium">委託内容</th>
              <th className="border px-3 py-2 text-left font-medium">所在国</th>
              <th className="border px-3 py-2 text-left font-medium">備考</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border px-3 py-2">
                <strong>Supabase, Inc.</strong>
              </td>
              <td className="border px-3 py-2">
                データベース、ユーザー認証、ファイルストレージ
              </td>
              <td className="border px-3 py-2">米国</td>
              <td className="border px-3 py-2">
                データ保存: 東京リージョン
              </td>
            </tr>
            <tr>
              <td className="border px-3 py-2">
                <strong>Stripe, Inc.</strong>
              </td>
              <td className="border px-3 py-2">決済処理、出品者への支払い</td>
              <td className="border px-3 py-2">米国</td>
              <td className="border px-3 py-2">PCI DSS Level 1準拠</td>
            </tr>
            <tr>
              <td className="border px-3 py-2">
                <strong>Google LLC</strong>
              </td>
              <td className="border px-3 py-2">
                AI採点エンジン（Generative AI）
              </td>
              <td className="border px-3 py-2">米国</td>
              <td className="border px-3 py-2">
                回答データを採点目的で送信
              </td>
            </tr>
            <tr>
              <td className="border px-3 py-2">
                <strong>Vercel, Inc.</strong>
              </td>
              <td className="border px-3 py-2">
                Webアプリケーションのホスティング
              </td>
              <td className="border px-3 py-2">米国</td>
              <td className="border px-3 py-2">
                Edge Network: 東京PoP
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p>
        AI採点機能の利用時、ユーザーの回答データは採点処理のためにGoogle
        LLCのGenerative
        AIサービスに送信されます。送信されたデータは採点結果の生成にのみ使用され、AIモデルの学習には利用されません。
      </p>

      <h2 id="privacy-6">第6条（個人情報の安全管理措置）</h2>
      <p>
        当社は、個人情報の漏洩、紛失、改ざんを防止するため、以下の安全管理措置を実施しています（個人情報保護法第23条）。
      </p>

      <h3>6.1 組織的安全管理措置</h3>
      <ul>
        <li>個人情報保護管理者の設置</li>
        <li>個人情報の取扱いに関する規程の整備</li>
        <li>個人情報の取扱状況の定期的な点検</li>
      </ul>

      <h3>6.2 技術的安全管理措置</h3>
      <ul>
        <li>
          通信の暗号化: すべての通信はTLS 1.2以上により暗号化
        </li>
        <li>
          アクセス制御: データベースにRow Level Security（RLS）を適用し、ユーザーが他者のデータにアクセスできないよう制御
        </li>
        <li>
          認証基盤: OAuth 2.0プロトコルによる安全な認証
        </li>
        <li>
          決済情報の分離: クレジットカード情報はStripeが管理し、当社サーバーには保存されない
        </li>
        <li>
          インフラストラクチャ: SOC 2 Type II認証を取得した事業者のサービスを使用
        </li>
      </ul>

      <h3>6.3 漏洩事案への対応</h3>
      <p>
        個人情報の漏洩等が発生した場合、当社は個人情報保護法第26条に基づき、個人情報保護委員会への報告および本人への通知を速やかに行います。
      </p>

      <h2 id="privacy-7">第7条（データの保存期間）</h2>
      <p>
        当社は、利用目的に必要な期間に限り個人情報を保存し、期間経過後は安全に削除または匿名化いたします。
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="border px-3 py-2 text-left font-medium">データ種別</th>
              <th className="border px-3 py-2 text-left font-medium">保存期間</th>
              <th className="border px-3 py-2 text-left font-medium">根拠</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border px-3 py-2">アカウント情報</td>
              <td className="border px-3 py-2">
                アカウント存続期間中 + 削除後90日間
              </td>
              <td className="border px-3 py-2">サービス提供のため</td>
            </tr>
            <tr>
              <td className="border px-3 py-2">学習履歴・採点結果</td>
              <td className="border px-3 py-2">最低3年間</td>
              <td className="border px-3 py-2">
                学習分析・サービス改善のため
              </td>
            </tr>
            <tr>
              <td className="border px-3 py-2">決済記録</td>
              <td className="border px-3 py-2">最低7年間</td>
              <td className="border px-3 py-2">
                商法・税法上の帳簿保存義務
              </td>
            </tr>
            <tr>
              <td className="border px-3 py-2">アクセスログ</td>
              <td className="border px-3 py-2">最低1年間</td>
              <td className="border px-3 py-2">
                セキュリティ・不正利用防止のため
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        アカウント削除時、表示名は匿名化処理（「退会済みユーザー」に置換）され、個人を特定できない形で統計データのみ保持されます。
      </p>

      <h2 id="privacy-8">第8条（保有個人データに関する請求）</h2>
      <p>
        ユーザーは、当社が保有する自己の個人情報について、以下の請求を行うことができます（個人情報保護法第33条〜第39条）。
      </p>
      <ol>
        <li>
          <strong>開示請求</strong>（第33条）:
          当社が保有する個人データの内容の通知を求めることができます。
        </li>
        <li>
          <strong>訂正・追加・削除請求</strong>（第34条）:
          個人データの内容が事実でない場合、訂正等を求めることができます。
        </li>
        <li>
          <strong>利用停止・消去請求</strong>（第35条）:
          個人データが目的外に利用されている場合等、利用停止や消去を求めることができます。
        </li>
        <li>
          <strong>第三者提供停止請求</strong>（第35条第5項）:
          第三者への提供の停止を求めることができます。
        </li>
      </ol>
      <p>
        請求方法: support@toinoma.jp 宛のメールにて受け付けます。本人確認後、原則として30日以内に回答いたします。本人確認のため、運転免許証等の身分証明書の提示をお願いする場合があります。
      </p>
      <p>
        なお、設定画面からプロフィール情報の変更やアカウントの削除を随時行うこともできます。
      </p>

      <h2 id="privacy-9">第9条（Cookie・トラッキング技術）</h2>
      <ol>
        <li>
          本サービスは、セッション管理のためにCookieを使用します。
        </li>
        <li>
          使用するCookieの種類:
          <ul>
            <li>
              <strong>必須Cookie</strong>:
              認証・セッション管理に不可欠なCookie（無効化不可）。Supabase Authのセッショントークンが含まれます。
            </li>
            <li>
              <strong>分析Cookie</strong>:
              サービス改善のためのアクセス分析に使用するCookie（同意により有効化）。
            </li>
          </ul>
        </li>
        <li>
          ブラウザの設定によりCookieを無効にできますが、必須Cookieを無効にした場合、本サービスの認証機能が利用できなくなります。
        </li>
      </ol>

      <h2 id="privacy-10">第10条（アクセス解析）</h2>
      <p>
        本サービスでは、サービスの利用状況を把握しサービスの改善に役立てるため、アクセス解析ツールを使用する場合があります。これらのツールは、Cookieを使用してユーザーの訪問履歴を収集しますが、個人を特定する情報は含まれません。収集されたデータは統計的な分析にのみ使用されます。
      </p>

      <h2 id="privacy-11">第11条（未成年者の個人情報）</h2>
      <p>
        16歳未満の方が本サービスを利用する場合、法定代理人（保護者）の同意を得た上でご利用ください。当社が16歳未満の方の個人情報を法定代理人の同意なく取得したことが判明した場合、速やかに当該情報を削除いたします。法定代理人の方は、support@toinoma.jp までご連絡ください。
      </p>

      <h2 id="privacy-12">第12条（越境データ移転）</h2>
      <p>
        本サービスでは、業務委託先の所在により、個人情報が日本国外（主に米国）のサーバーに保存・処理される場合があります（個人情報保護法第28条）。
      </p>
      <ul>
        <li>
          各委託先とは、GDPR同等のデータ保護水準を確保する契約条項（Standard Contractual Clauses等）を含む適切なデータ処理契約を締結しています。
        </li>
        <li>
          データベース（Supabase）のプライマリデータは東京リージョンに保存されます。
        </li>
        <li>
          AI採点時の回答データは、処理のため一時的に米国のサーバーに送信されますが、処理完了後は保持されません。
        </li>
      </ul>

      <h2 id="privacy-13">第13条（個人情報の匿名加工）</h2>
      <p>
        当社は、サービスの改善および統計分析の目的で、個人情報を匿名加工情報（個人情報保護法第2条第6項）に加工して利用する場合があります。匿名加工情報を作成する場合は、法令に定める基準に従い適切な加工を行い、復元できないようにいたします。
      </p>

      <h2 id="privacy-14">第14条（ポリシーの変更）</h2>
      <ol>
        <li>
          当社は、法令の改正やサービス内容の変更に伴い、本ポリシーを変更する場合があります。
        </li>
        <li>
          重要な変更（利用目的の追加、第三者提供先の変更等）の場合は、効力発生日の少なくとも30日前までにユーザーに通知いたします。
        </li>
        <li>
          変更後のポリシーは、本サービス上に掲載された時点から効力を生じます。
        </li>
      </ol>

      <h2 id="privacy-15">第15条（お問い合わせ窓口）</h2>
      <p>
        個人情報の取扱いに関するお問い合わせ、開示・訂正・削除の請求、苦情の申出は以下までご連絡ください。
      </p>
      <div className="rounded-lg border p-4">
        <p className="mb-1 font-medium">問の間運営</p>
        <p className="mb-1">個人情報保護管理者: 代表者</p>
        <p className="mb-1">メール: support@toinoma.jp</p>
        <p className="text-sm text-muted-foreground">
          受付時間: 平日10:00〜18:00（土日祝日・年末年始を除く）
        </p>
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
