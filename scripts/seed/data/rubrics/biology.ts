import type { QuestionSpec } from "../../types";

const SLUG = "biology";

export const biologyQuestions: QuestionSpec[] = [
  {
    ordinal: 1,
    sectionTitle: "第1問 細胞・分子生物学",
    questionType: "essay",
    questionText:
      "真核細胞のミトコンドリアと葉緑体には、両者ともに独自のDNAが存在することが知られている。この事実が示唆する両オルガネラの起源(細胞内共生説)について、根拠とともに150字程度で論述しなさい。",
    rubric: {
      type: "essay",
      number: "1",
      points: 20,
      rubricElements: [
        { element: "細胞内共生説の概要が正しく説明されている", points: 5 },
        { element: "ミトコンドリアと葉緑体の独自DNAが共通の根拠として示されている", points: 5 },
        { element: "二重膜構造・分裂様式・リボソーム類似性などの傍証を1つ以上挙げている", points: 5 },
        { element: "150字前後の字数で簡潔に論述", points: 3 },
        { element: "原核生物との関連を明示", points: 2 },
      ],
      modelAnswer:
        "両オルガネラは独自の環状DNAと70Sリボソームを持ち、二重膜で囲まれて二分裂で増殖する。これらの特徴は原核生物と一致するため、好気性細菌とシアノバクテリアの祖先がそれぞれ宿主細胞に取り込まれ共生した結果オルガネラ化したと考えられる。",
    },
    modelAnswer: "(see rubric.modelAnswer)",
    topicTags: ["seed:utokyo-2026", SLUG, `seed:utokyo-2026:${SLUG}:1`, "submission-mode:photo-preferred"],
    difficulty: "hard",
    estimatedMinutes: 25,
    points: 20,
    preferredSubmissionMode: "photo",
  },
  {
    ordinal: 2,
    sectionTitle: "第2問 遺伝・発生",
    questionType: "essay",
    questionText:
      "ヒトのABO式血液型における対立遺伝子 A、B、O について、A と B は共優性、O は劣性である。両親の血液型がそれぞれ AO 型と BO 型のとき、生まれる子の血液型と分離比を理由とともに記しなさい。",
    rubric: {
      type: "essay",
      number: "2",
      points: 15,
      rubricElements: [
        { element: "両親の遺伝子型を AO × BO と正確に記述", points: 3 },
        { element: "メンデルの法則に基づく組合せ表を用いて4通りを列挙", points: 5 },
        { element: "A、B、AB、O = 1:1:1:1 の分離比を結論", points: 4 },
        { element: "共優性・劣性の関係を踏まえて表現型を記述", points: 3 },
      ],
      modelAnswer:
        "AO × BO → AB, AO, BO, OO 各 1。表現型は AB:A:B:O = 1:1:1:1。",
    },
    modelAnswer: "(see rubric.modelAnswer)",
    topicTags: ["seed:utokyo-2026", SLUG, `seed:utokyo-2026:${SLUG}:2`],
    difficulty: "hard",
    estimatedMinutes: 20,
    points: 15,
  },
  {
    ordinal: 3,
    sectionTitle: "第3問 生態学",
    questionType: "essay",
    questionText:
      "ある地域に外来捕食者が侵入したとき、在来の被食者個体群と捕食者の関係はロトカ・ヴォルテラの捕食者-被食者モデルでどのように動的に変化するか、120字以内で説明しなさい。",
    rubric: {
      type: "essay",
      number: "3",
      points: 15,
      rubricElements: [
        { element: "周期的振動が生じることを言及", points: 4 },
        { element: "捕食者と被食者の位相差(被食者が先に増加)を述べている", points: 4 },
        { element: "在来種の絶滅リスクなど生態学的含意に触れている", points: 4 },
        { element: "120字以内の字数制限を遵守", points: 3 },
      ],
      modelAnswer:
        "被食者が増えると遅れて捕食者が増加し、被食者が減少すると捕食者も減って再び被食者が増えるという周期的振動が生じる。在来種は捕食圧に適応できず急減・絶滅に至る恐れがある。",
    },
    modelAnswer: "(see rubric.modelAnswer)",
    topicTags: ["seed:utokyo-2026", SLUG, `seed:utokyo-2026:${SLUG}:3`],
    difficulty: "hard",
    estimatedMinutes: 20,
    points: 15,
  },
];
