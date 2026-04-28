import type { QuestionSpec } from "../../types";

const SLUG = "physics";

export const physicsQuestions: QuestionSpec[] = [
  {
    ordinal: 1,
    sectionTitle: "第1問 力学",
    questionType: "essay",
    questionText:
      "なめらかな水平面上に質量 M の台車を置き、その上に質量 m の小物体を載せる。台車に水平方向の外力 F を加えた瞬間から、小物体と台車の間の摩擦係数を μ として、(1) 小物体が台車に対して滑り出さないための F の最大値、(2) 滑り始めた直後の小物体の加速度を求めなさい。",
    rubric: {
      type: "essay",
      number: "1",
      points: 25,
      rubricElements: [
        { element: "小物体に働く力を自由体図で正しく図示している", points: 5 },
        { element: "(1) 摩擦力 = ma の関係から F_max = μ(M+m)g を導出", points: 7 },
        { element: "(2) 動摩擦力を用いた小物体の加速度 a = μg を導出", points: 6 },
        { element: "台車と小物体の運動を分離して論じている", points: 4 },
        { element: "単位と方向が一貫して記述されている", points: 3 },
      ],
      modelAnswer:
        "(1) 共通加速度 a' = F/(M+m)。小物体に必要な摩擦 ≦ μmg → F_max = μ(M+m)g。 (2) 滑った後、小物体の加速度は μg(外力 F とは独立)。",
    },
    modelAnswer: "(see rubric.modelAnswer)",
    topicTags: ["seed:utokyo-2026", SLUG, `seed:utokyo-2026:${SLUG}:1`, "submission-mode:photo-preferred"],
    difficulty: "hard",
    estimatedMinutes: 30,
    points: 25,
    preferredSubmissionMode: "photo",
  },
  {
    ordinal: 2,
    sectionTitle: "第2問 電磁気",
    questionType: "essay",
    questionText:
      "一様な磁束密度 B の磁場中に、長さ ℓ の導体棒を磁場と垂直に保ったまま、磁場と垂直方向に速度 v で動かす。回路の抵抗を R とするとき、(1) 誘導起電力の大きさ、(2) 棒に働く外力の仕事率を求めなさい。",
    rubric: {
      type: "essay",
      number: "2",
      points: 20,
      rubricElements: [
        { element: "(1) 誘導起電力 V = Bℓv の導出が正確", points: 6 },
        { element: "回路を流れる電流 I = V/R を求めている", points: 4 },
        { element: "(2) 導体棒に働く磁場からの力 F = BIℓ を計算", points: 4 },
        { element: "外力の仕事率 P = Fv = (Bℓv)²/R を導出", points: 4 },
        { element: "エネルギー保存(発熱量と外力仕事率の一致)を言及", points: 2 },
      ],
      modelAnswer:
        "(1) V = Bℓv、I = Bℓv/R。 (2) F = BIℓ = (Bℓ)²v/R。仕事率 P = Fv = (Bℓv)²/R(発熱量と一致)。",
    },
    modelAnswer: "(see rubric.modelAnswer)",
    topicTags: ["seed:utokyo-2026", SLUG, `seed:utokyo-2026:${SLUG}:2`],
    difficulty: "hard",
    estimatedMinutes: 25,
    points: 20,
  },
  {
    ordinal: 3,
    sectionTitle: "第3問 熱力学(短答)",
    questionType: "fill_in_blank",
    questionText:
      "理想気体 1 mol を等温(温度 T)で体積 V₁ から V₂ まで可逆的に膨張させたとき、気体が外部に対してした仕事 W を、気体定数 R を用いて表しなさい。(自然対数 ln を使用)",
    rubric: {
      type: "fill_in_blank",
      number: "3",
      points: 8,
      acceptedAnswers: [
        "RT ln(V2/V1)",
        "RT*ln(V2/V1)",
        "R T ln(V2/V1)",
        "RTln(V2/V1)",
      ],
      caseSensitive: false,
    },
    modelAnswer: "RT ln(V2/V1)",
    topicTags: ["seed:utokyo-2026", SLUG, `seed:utokyo-2026:${SLUG}:3`],
    difficulty: "hard",
    estimatedMinutes: 8,
    points: 8,
  },
];
