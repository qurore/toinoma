import type { QuestionSpec } from "../../types";

const SLUG = "math_humanities";

export const mathHumanitiesQuestions: QuestionSpec[] = [
  {
    ordinal: 1,
    sectionTitle: "第1問",
    questionType: "essay",
    questionText:
      "座標平面上に放物線 C: y = x² − 2x がある。直線 ℓ: y = mx が C と異なる2点で交わるとき、その2交点の中点 M の軌跡を求めなさい。",
    rubric: {
      type: "essay",
      number: "1",
      points: 20,
      rubricElements: [
        { element: "交点条件 x² − (m+2)x = 0 を導出している", points: 5 },
        { element: "中点 M の座標を m の式で表現している", points: 6 },
        { element: "m を消去して軌跡の方程式を導いている", points: 5 },
        { element: "m の取りうる範囲(交点条件)を考慮し軌跡を限定している", points: 4 },
      ],
      modelAnswer:
        "交点 x 座標は 0 と m+2、ゆえに M = ((m+2)/2, m(m+2)/2)。X = (m+2)/2、Y = m(m+2)/2 から m = 2X − 2 を代入し Y = (2X−2)·X = 2X² − 2X。m ≠ 0 より X ≠ 1。軌跡は y = 2x² − 2x (x ≠ 1)。",
    },
    modelAnswer: "(see rubric.modelAnswer)",
    topicTags: ["seed:utokyo-2026", SLUG, `seed:utokyo-2026:${SLUG}:1`],
    difficulty: "medium",
    estimatedMinutes: 35,
    points: 20,
  },
  {
    ordinal: 2,
    sectionTitle: "第2問",
    questionType: "essay",
    questionText:
      "袋の中に赤玉3個・白玉2個・青玉1個が入っている。袋から無作為に2個を同時に取り出すとき、(1) 2個とも異なる色である確率を求めなさい。 (2) 取り出した2個に少なくとも1個赤玉が含まれる条件のもとで、2個とも異なる色である条件付き確率を求めなさい。",
    rubric: {
      type: "essay",
      number: "2",
      points: 20,
      rubricElements: [
        { element: "全事象 C(6,2) = 15 を基準として整理している", points: 4 },
        { element: "同色組合せを正しく数え上げ(赤×赤=3, 白×白=1)、異色確率を導出", points: 6 },
        { element: "(2)で「赤を含む」事象を正しく定義し場合分けしている", points: 5 },
        { element: "条件付き確率の定義 P(A|B)=P(A∩B)/P(B) を用いて結論", points: 5 },
      ],
      modelAnswer:
        "(1) 異色 = 1 − (3+1)/15 = 11/15。 (2) 赤を含む組合せ = C(3,1)·C(3,1) + C(3,2) = 9+3 = 12。そのうち異色は赤×白=6、赤×青=3、計9。条件付き確率 = 9/12 = 3/4。",
    },
    modelAnswer: "(see rubric.modelAnswer)",
    topicTags: ["seed:utokyo-2026", SLUG, `seed:utokyo-2026:${SLUG}:2`, "submission-mode:photo-preferred"],
    difficulty: "medium",
    estimatedMinutes: 35,
    points: 20,
    preferredSubmissionMode: "photo",
  },
];
