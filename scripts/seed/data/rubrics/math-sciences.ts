import type { QuestionSpec } from "../../types";

const SLUG = "math_sciences";

export const mathSciencesQuestions: QuestionSpec[] = [
  {
    ordinal: 1,
    sectionTitle: "第1問",
    questionType: "essay",
    questionText:
      "実数 a に対し、関数 f(x) = x³ − 3ax + a の極値の差が 4√3 となるような a の値をすべて求めなさい。",
    rubric: {
      type: "essay",
      number: "1",
      points: 20,
      rubricElements: [
        { element: "f'(x)=0 を解いて極値の x 座標を a で表現できている", points: 5 },
        { element: "極大値・極小値の差を a の式で正しく導出している", points: 7 },
        { element: "差が 4√3 となる方程式を解き a の値を漏れなく求めている", points: 5 },
        { element: "途中計算と論証が明瞭に記述されている", points: 3 },
      ],
      modelAnswer:
        "f'(x) = 3x² − 3a より a > 0 のとき極値の x = ±√a。極大−極小 = 4a√a。これが 4√3 となる条件 4a^(3/2) = 4√3 から a^(3/2) = √3 より a = 3^(1/3) … (a < 0 のとき実数極値は存在しないので不適)。",
    },
    modelAnswer: "(see rubric.modelAnswer)",
    topicTags: ["seed:utokyo-2026", SLUG, `seed:utokyo-2026:${SLUG}:1`, "submission-mode:photo-preferred"],
    difficulty: "hard",
    estimatedMinutes: 40,
    points: 20,
    preferredSubmissionMode: "photo",
  },
  {
    ordinal: 2,
    sectionTitle: "第2問",
    questionType: "essay",
    questionText:
      "複素数平面上の点 z が条件 |z − 2i| ≦ 1 を満たすとき、w = (z − 1)/(z + 1) が描く領域を図示し、面積を求めなさい。",
    rubric: {
      type: "essay",
      number: "2",
      points: 20,
      rubricElements: [
        { element: "一次分数変換が円を円(または直線)に写す事実を用いている", points: 4 },
        { element: "z の領域に対する w の像を正確に決定している", points: 8 },
        { element: "図示が境界(円弧)・内部の包含関係まで正確である", points: 4 },
        { element: "面積を解析的に正しく算出している", points: 4 },
      ],
      modelAnswer:
        "z = 2i + e^(iθ)·r (0 ≦ r ≦ 1) を代入して w を計算し、w が描く領域は中心 ((1+5i)/3) 半径 √5/3 の円板であることを示す。面積 = π(√5/3)² = 5π/9。",
    },
    modelAnswer: "(see rubric.modelAnswer)",
    topicTags: ["seed:utokyo-2026", SLUG, `seed:utokyo-2026:${SLUG}:2`],
    difficulty: "hard",
    estimatedMinutes: 40,
    points: 20,
  },
  {
    ordinal: 3,
    sectionTitle: "第3問",
    questionType: "essay",
    questionText:
      "正の整数 n に対し、a_n = ∫₀^(π/2) (sin x)^n dx とおく。(1) a_n と a_{n−2} の関係式を導出しなさい。 (2) lim_{n→∞} (a_n / a_{n−1}) を求めなさい。",
    rubric: {
      type: "essay",
      number: "3",
      points: 20,
      rubricElements: [
        { element: "部分積分により a_n = ((n−1)/n)·a_{n−2} を正しく導出", points: 7 },
        { element: "a_n の単調減少性を示している", points: 4 },
        { element: "はさみうちの原理を用いて極限の存在を論証", points: 5 },
        { element: "極限値が 1 に等しいことを正しく結論", points: 4 },
      ],
      modelAnswer:
        "(1) ∫(sinx)^n dx = ∫(sinx)^(n−1)·sinx dx の部分積分から a_n = ((n−1)/n)·a_{n−2}。 (2) a_n の単調性と a_n/a_{n−2} = (n−1)/n → 1 から、a_n/a_{n−1} → 1 となる。",
    },
    modelAnswer: "(see rubric.modelAnswer)",
    topicTags: ["seed:utokyo-2026", SLUG, `seed:utokyo-2026:${SLUG}:3`],
    difficulty: "hard",
    estimatedMinutes: 40,
    points: 20,
  },
];
