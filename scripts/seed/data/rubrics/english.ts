import type { QuestionSpec } from "../../types";

const SLUG = "english";

export const englishQuestions: QuestionSpec[] = [
  {
    ordinal: 1,
    sectionTitle: "第1問",
    questionType: "essay",
    questionText:
      "次の英文を読み、下線部の趣旨を踏まえて、筆者が artificial intelligence の社会実装について抱く懸念を 70〜80 語の英文で要約しなさい。",
    rubric: {
      type: "essay",
      number: "1",
      points: 30,
      rubricElements: [
        { element: "AIの社会実装に関する懸念点が3つ以上挙げられている", points: 9 },
        { element: "下線部の趣旨に直接対応した記述である", points: 8 },
        { element: "70〜80語の語数制限を満たしている", points: 5 },
        { element: "文法・語彙が概ね正確である(誤りが2つ以下)", points: 5 },
        { element: "論理構成が明瞭で結論まで一貫している", points: 3 },
      ],
      modelAnswer:
        "The author warns that the rapid social deployment of AI raises three intertwined concerns: first, the opacity of decision-making erodes accountability; second, automation accelerates labor displacement faster than retraining can keep pace; and third, concentrated data access widens existing power asymmetries. He concludes that public deliberation, not technical optimization alone, must guide the pace of adoption.",
    },
    modelAnswer: "(see rubric.modelAnswer)",
    topicTags: ["seed:utokyo-2026", SLUG, `seed:utokyo-2026:${SLUG}:1`, "submission-mode:photo-preferred"],
    difficulty: "medium",
    estimatedMinutes: 25,
    points: 30,
    preferredSubmissionMode: "photo",
  },
  {
    ordinal: 2,
    sectionTitle: "第2問",
    questionType: "mark_sheet",
    questionText:
      "次の英文の主旨として最も適切なものを下の選択肢から1つ選びなさい。",
    rubric: {
      type: "mark_sheet",
      number: "2",
      points: 8,
      correctAnswer: "C",
      choices: [
        "A. 都市化は地域共同体の結束を一様に強化する",
        "B. 通勤時間の短縮が個人の幸福度を最も大きく高める",
        "C. 弱い紐帯のネットワークが新たな機会創出に寄与する",
        "D. 大学進学率と所得格差は無関係である",
      ],
    },
    modelAnswer: "C",
    topicTags: ["seed:utokyo-2026", SLUG, `seed:utokyo-2026:${SLUG}:2`],
    difficulty: "medium",
    estimatedMinutes: 8,
    points: 8,
  },
  {
    ordinal: 3,
    sectionTitle: "第3問",
    questionType: "fill_in_blank",
    questionText:
      "次の英文の空所に入る最も適切な語を、文脈に即して英語1語で答えなさい。 The committee’s ___ to address structural inequities reflected a broader institutional reluctance.",
    rubric: {
      type: "fill_in_blank",
      number: "3",
      points: 6,
      acceptedAnswers: ["failure", "reluctance", "inability", "refusal"],
      caseSensitive: false,
    },
    modelAnswer: "failure",
    topicTags: ["seed:utokyo-2026", SLUG, `seed:utokyo-2026:${SLUG}:3`],
    difficulty: "medium",
    estimatedMinutes: 4,
    points: 6,
  },
];
