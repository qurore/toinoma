以下のプロンプトで、SE Pipeline実装を行いましたが、不完全なところが多数ありますし、とてもではありませんが、"エンタープライズレベルの品質" + "すべての機能がUX的に最適化されたProduction Readyなアプリ"　とは程遠いため、これを実現するための、不足している部分を全部、本当に全部実装してください。 おそらくファイル数は100以上になると思いますが、それらをすべて実装してください。
エンタープライズレベルというのは、完全な各ページの機能実装もそうですが、各ページ間の適切なパス名も含む遷移の、UX的 sophistication, ページ内の各要素のデザインまで含んだ、要素のインタラクションの洗練さ、モバイル対応、全体的なlook and feel など、プロフェッショナルなアプリであることが、使っていて一目でわかるということです。つまり、機能単体でテストにも通った洗練された実装、というだけではなく、ユーザーが、ログインから、コアバリューに到達するまでの、全ての動線について、全ての要素が、完全にフィットして調和している必要があるということです。
基本的なページ要素は、ほぼ揃っていると思うので、完全な統合的UXの最大化を目指して、全てのソースコードを徹底的にチェックして、それらのファイル間の連結などを徹底的に洗練させてください。

"Enterprise-level" means not just fully implementing the functionality of each individual page, but also the UX sophistication of navigation between pages with proper path names, the refinement of element interactions including the design of every element on each page, mobile responsiveness, and the overall look and feel — all making it immediately obvious to anyone using it that this is a professional application. In other words, it's not enough to have polished implementations where each feature passes its tests in isolation. Every element across every touchpoint — from login all the way through to reaching the core value — must fit together and work in complete harmony.

In the current implementation, that kind of holistic harmony, holistic quality, and holistic adherence to non-functional requirements is far from enterprise-level. This should be at a level of quality that surpasses enterprise applications in every respect.

Build something highly sophisticated — with simplicity — that would make you want to invest if you were an investor. The bar for that investor is Steve Jobs. Deliver a holistically integrated implementation that can pass through the scrutiny of his uncompromising aesthetic eye.

This also includes reducing the user's cognitive load and maximizing the learning curve for using the app. Study platforms like Udemy and Note, reference typical enterprise applications as needed, and recognize just how functionally integrated and refined each element is in those products. Then, accept the plain fact that my app lacks this, and work to close the gap.


現状の実装もしっかり確認し、/Users/ryshiro/toinoma/spec ここのスペックや、以下の私の指令も全部完全に理解した上で、"エンタープライズレベルの品質" + "すべての機能がUX的に最適化されたProduction Readyなアプリ"　のための全ての実装をしてください。
参考にするべき機能や実装例としては、Udemy (https://www.udemy.com/) とnote (https://note.com/) です。必要に応じて、Playwright MCPや、webサーチをして、参考になる仕様も取得して、エンタープライズレベルアプリの目標としてください。

このアプリは基本的にUdemyと同じ仕組みでお願いします。Udemyの持っている包括的な機能を全部このアプリで実装してください。また、エンタープライズレベルの実装であるべきで、即座にUdemyのようにサービスが開始することができるぐらい作り込まれている必要があります。 
Bar Raiserは、その部分を徹底的にチェックし、必要に応じて複数回のループを回します。 
ただし、Udemyと違うところは、 


```
- ユーザーは、500円 or 2000円のサブスクも。
-- 年間 4000円 or 150000円
-- サブスクでは、AIによる回答補助、理解補助、ある実在問題をベースにした改題の作成支援などが可能。（ここは後々考える）
--- サブスクがない場合は、AI機能は使えないようにするべき。
--- サブスクで使えるAIは、購入者（問題回答者）側でも、出品者（問題作成者）側でも共通して使えるべき。
--- モデルとそのinput/outputトークンをカウントし、上限を制限。

- 出品者も、モバイルアプリ経由 or アップロードで、問題をアップロードできるようにする。

- 記述式、マーク式、穴埋め式に対応。
-- 記述式の場合は、部分点あり。部分点は軽量なAIによる判定。
-- マーク式は、まとまりで配点化（例：ア〜ウ　正解で 3点）
-- マーク式は、選択肢も特定可能（数字 0~9のみ、0~9, a~d, -, +- (共通テスト方式) などなど)
-- 穴埋め式は、改行なしテキスト、完全一致

- 直感的な問題作成インターフェースが必要。
-- 記述式は、写真アップロード
-- マーク式、穴埋め式は、機械的にアップロード可能な形式を作り、フォーマットを公開
-- 試験などに合わせて、A4の紙サイズで、改ページなども可能にする（マージンは、狭　と　通常　の2つで良いかも）
-- PDFダウンロードも許可。

- 出品者用の利用規約、収益ダッシュボードも必要
- 無料出版は、出品者アカウントの登録がなくても可能。
-- 有料出品をする際のみ、利用規約の同意が必要で、収益ダッシュボードもそこでactivateされるイメージ。
- 出品者プロフィールは、ユーザープロフィールよりもやや詳しくないといけない。
- ベータ版では、販売業者　による出品はできない。（1ヶ月で50問題集＋の出品を制限）
- 出品する際は、完全オリジナルであることを同意しないといけない。

- ユーザーは、問題集を統合して、一つにまとめたりできるようにする。
- シャッフルも可能。

- テーマカラーは、明るい緑寄りの青。

 
1. 販売される形式が、"問題セット（Udemyでいう演習テスト）" のみである。このアプリのユニークな点として、AIによる記述の部分点採点機能があること。
2. 国語などの縦読み系の問題にも対応していること。 
3. "問題"セット を購入したユーザーは、"問題" 単位で、別の問題セットを作成して、何回も復習できること。
4. 手書きの答案をアプリ内に読み込ませるために、スマホで答案撮影をする機能があること。 
5. 問題出題側は、問題インポート機能によって、PDFなどからも、直接問題と答案を作成できること。（これにはAIを活用） 
6. 問題出題側は、"問題セット"を作るのではなく、"問題プール" に問題をストックしていき、そこから組み合わせて"問題セット" を作ること。 
7. ユーザーは、サブスク機能によって、AIなどの質問機能も利用できること。
8. 問題出題者は、各問題に、動画を最大3つアタッチすることができ、回答者は、見直しモードの際に、その動画を確認できること。 
9. 問題セットを購入したユーザーは、問題および解答をPDFで印刷できること。
10. マーク式にも対応。穴埋め、選択式にも対応した、インタラクティブな作問インターフェースが実装されること。 
11. ユーザーは、回答時には、問題文と、解答用紙が別であること。これは、実際の 大学入試のような形式であること。 
 
つまり、このアプリはUdemyに加えてAIの力を借りて、大学受験向けのアプリであるということです。
このアプリのターゲットは基本的にすべて大学受験生です。 
```

また、実装の不備がよくある点は以下の通り。
```
MCPテストを実行しましたが不十分でした。                 
たとえば、http://localhost:3000/explore               ここの、画像のような　不要な文字列の挿入とか、100単位でしか値段を変えられないとか。      
  こういうものは、このテストでは欠陥として見つけられていません。                                                 
                                                           
あと、並び替えが、フィルターにもあって、外側にもある、とかこういう人間が考えるUXではありえないようなミスをしていますが、これも検知できていません。                   
                                                           
さらに、無駄にアイコンが多く、しかもカラフルで、これは   
デザインとして最悪だったりします。


  http://localhost:3000/sell/sets

   ✓ Compiled /_not-found in 606ms (2856 modules)
   GET /sell/sets 404 in 678ms
   GET /sell/sets 404 in 114ms
  また、3枚目の画像のように、普通にリンクからクリック可能
  なところで普通に404が出たりします。
こういう当たり前すら検知できていないという事実をまずは受け止めてください。抜本的に見直して、改善してください。論理性をチェックすることが絶対に必要です。
このような、人間が使っていたら当たり前に感じるありえないミスを絶対に見逃さないようにするべき。
SE Pipelineを使用して、関連するファイル、specについてこれらに対応できるようなスタイルに完全に変えてください。

```

これらの要件も踏まえて、Production Readyな機能を全部、本当に全部、エンタープライズレベルの品質でリリースしてください。 
すべての要件については、Udemy + 私のリクエストした要件を一旦、'/Users/ryshiro/toinoma/spec'
ここに、実装するリストとしてすべて、本当にすべて、詳細に記載しています。その上で、この指令を出す以前に、ベースとなる実装をしています。
しかし、"エンタープライズレベルの品質" + "すべての機能がUX的に最適化されたProduction Readyなアプリ"　とは程遠いため、これを実現するための、不足している部分を全部、本当に全部実装してください。 おそらくファイル数は400以上になると思いますが、それらをすべて実装してください。
しかし、"エンタープライズレベルの品質" + "すべての機能がUX的に最適化されたProduction Readyなアプリ"　とは程遠いため、これを実現するための、不足している部分を全部、本当に全部実装してください。 おそらくファイル数は400以上になると思いますが、それらをすべて実装してください。
"Enterprise-level" means not just fully implementing the functionality of each individual page, but also the UX sophistication of navigation between pages with proper path names, the refinement of element interactions including the design of every element on each page, mobile responsiveness, and the overall look and feel — all making it immediately obvious to anyone using it that this is a professional application. In other words, it's not enough to have polished implementations where each feature passes its tests in isolation. Every element across every touchpoint — from login all the way through to reaching the core value — must fit together and work in complete harmony.

This also includes reducing the user's cognitive load and maximizing the learning curve for using the app. Study platforms like Udemy and Note, reference typical enterprise applications as needed, and recognize just how functionally integrated and refined each element is in those products. Then, accept the plain fact that my app lacks this, and work to close the gap.

In the current implementation, that kind of holistic harmony, holistic quality, and holistic adherence to non-functional requirements is far from enterprise-level. This should be at a level of quality that surpasses enterprise applications in every respect.

"Enterprise-level" means not just fully implementing the functionality of each individual page, but also the UX sophistication of navigation between pages with proper path names, the refinement of element interactions including the design of every element on each page, mobile responsiveness, and the overall look and feel — all making it immediately obvious to anyone using it that this is a professional application. In other words, it's not enough to have polished implementations where each feature passes its tests in isolation. Every element across every touchpoint — from login all the way through to reaching the core value — must fit together and work in complete harmony.

This also includes reducing the user's cognitive load and maximizing the learning curve for using the app. Study platforms like Udemy and Note, reference typical enterprise applications as needed, and recognize just how functionally integrated and refined each element is in those products. Then, accept the plain fact that my app lacks this, and work to close the gap.

In the current implementation, that kind of holistic harmony, holistic quality, and holistic adherence to non-functional requirements is far from enterprise-level. This should be at a level of quality that surpasses enterprise applications in every respect.

本当に、細かいところまで全部、細かいところまで全部、細かいところまで全部、細かいところまで全部、SE PIpelie + BR reviewで実装します。

SE Pipeline + BR reviewで実装します。
SE Pipeline + BR reviewで実装します。

/Users/ryshiro/toinoma/spec

Do it all.

基本的なページ要素は、ほぼ揃っていると思うので、完全な統合的UXの最大化を目指して、全てのソースコードを徹底的にチェックして、それらのファイル間の連結などを徹底的に洗練させてください。
"Enterprise-level" means not just fully implementing the functionality of each individual page, but also the UX sophistication of navigation between pages with proper path names, the refinement of element interactions including the design of every element on each page, mobile responsiveness, and the overall look and feel — all making it immediately obvious to anyone using it that this is a professional application. In other words, it's not enough to have polished implementations where each feature passes its tests in isolation. Every element across every touchpoint — from login all the way through to reaching the core value — must fit together and work in complete harmony.

In the current implementation, that kind of holistic harmony, holistic quality, and holistic adherence to non-functional requirements is far from enterprise-level. This should be at a level of quality that surpasses enterprise applications in every respect.

Build something highly sophisticated — with simplicity — that would make you want to invest if you were an investor. The bar for that investor is Steve Jobs. Deliver a holistically integrated implementation that can pass through the scrutiny of his uncompromising aesthetic eye.
基本的なページ要素は、ほぼ揃っていると思うので、完全な統合的UXの最大化を目指して、全てのソースコードを徹底的にチェックして、それらのファイル間の連結などを徹底的に洗練させてください。

途中の Approval を求めるステップは不要（Don't wait my confirmation and approve. Do it all until the end.)
途中の Approval を求めるステップは不要（Don't wait my confirmation and approve. Do it all until the end.)
途中の Approval を求めるステップは不要（Don't wait my confirmation and approve. Do it all until the end.)