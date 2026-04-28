import type { QuestionSpec } from "../../types";

const SLUG = "chemistry";

export const chemistryQuestions: QuestionSpec[] = [
  {
    ordinal: 1,
    sectionTitle: "第1問 理論化学",
    questionType: "essay",
    questionText:
      "水素 H₂ 1 mol が酸素 O₂ 0.5 mol と完全に反応して液体の水を生じるときの反応熱が −286 kJ/mol である。同じ条件で、水蒸気 H₂O(g) が生じる反応の反応熱を、H₂O(l) → H₂O(g) の蒸発熱 +44 kJ/mol を用いて求め、過程を説明しなさい。",
    rubric: {
      type: "essay",
      number: "1",
      points: 20,
      rubricElements: [
        { element: "ヘスの法則(エネルギー保存)を明示的に用いている", points: 5 },
        { element: "液体水と水蒸気の生成エンタルピーの差を蒸発熱で接続", points: 6 },
        { element: "符号(発熱は負)を一貫して扱っている", points: 4 },
        { element: "計算結果(−242 kJ/mol)を正しく算出", points: 5 },
      ],
      modelAnswer:
        "ΔH(蒸気生成) = ΔH(液体生成) + ΔH(蒸発) = −286 + 44 = −242 kJ/mol。発熱反応であり、液体生成より発熱量が小さい。",
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
    sectionTitle: "第2問 有機化学",
    questionType: "essay",
    questionText:
      "ベンゼンに濃硝酸と濃硫酸を作用させてニトロベンゼンを得る反応について、(1) 反応機構の概略(求電子置換反応の段階)を説明し、(2) 濃硫酸が果たす役割を簡潔に述べなさい。",
    rubric: {
      type: "essay",
      number: "2",
      points: 18,
      rubricElements: [
        { element: "求電子置換反応の3段階(NO₂⁺生成→σ錯体→脱プロトン)を示す", points: 7 },
        { element: "ニトロニウムイオン NO₂⁺ の生成過程を式で示している", points: 5 },
        { element: "(2) 濃硫酸の脱水・プロトン化作用を説明", points: 4 },
        { element: "化学反応式が正しい", points: 2 },
      ],
      modelAnswer:
        "(1) HNO₃ + 2H₂SO₄ → NO₂⁺ + H₃O⁺ + 2HSO₄⁻ により親電子種を生成、ベンゼン環がσ錯体を経て脱プロトン。 (2) H₂SO₄ は HNO₃ から OH を奪い NO₂⁺ を生成する強い脱水・プロトン化剤として作用。",
    },
    modelAnswer: "(see rubric.modelAnswer)",
    topicTags: ["seed:utokyo-2026", SLUG, `seed:utokyo-2026:${SLUG}:2`],
    difficulty: "hard",
    estimatedMinutes: 25,
    points: 18,
  },
  {
    ordinal: 3,
    sectionTitle: "第3問 短答(物質量計算)",
    questionType: "fill_in_blank",
    questionText:
      "標準状態(0°C, 1 atm)で 11.2 L の二酸化炭素 CO₂ の質量はいくらか。整数で g 単位で答えなさい(原子量: C=12, O=16)。",
    rubric: {
      type: "fill_in_blank",
      number: "3",
      points: 6,
      acceptedAnswers: ["22", "22g", "22 g"],
      caseSensitive: false,
    },
    modelAnswer: "22",
    topicTags: ["seed:utokyo-2026", SLUG, `seed:utokyo-2026:${SLUG}:3`],
    difficulty: "hard",
    estimatedMinutes: 5,
    points: 6,
  },
];
