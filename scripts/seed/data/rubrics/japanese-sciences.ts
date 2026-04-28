import type { QuestionSpec } from "../../types";

const SLUG = "japanese_sciences";

export const japaneseSciencesQuestions: QuestionSpec[] = [
  {
    ordinal: 1,
    sectionTitle: "第1問 現代文",
    questionType: "essay",
    questionText:
      "次の評論文(課題本文を参照)を読み、傍線部「日常的経験の中に潜む差異化の運動」とは何を指しているのか、本文に即して80字以内で説明しなさい。",
    rubric: {
      type: "essay",
      number: "1",
      points: 20,
      rubricElements: [
        { element: "「差異化の運動」を本文の文脈に基づき具体的に定義している", points: 6 },
        { element: "「日常的経験」との結びつきを明示している", points: 5 },
        { element: "80字以内の字数制限を遵守している", points: 4 },
        { element: "比喩や抽象語を自分の言葉で言い換えられている", points: 3 },
        { element: "因果関係や論理展開が明瞭である", points: 2 },
      ],
      modelAnswer:
        "私たちが当然視する慣習や物の見方が、対比される他者や場面と出会うことで揺らぎ、新たな意味を獲得していく無自覚で連続的な思考の働きを指す。",
    },
    modelAnswer: "(see rubric.modelAnswer)",
    topicTags: ["seed:utokyo-2026", SLUG, `seed:utokyo-2026:${SLUG}:1`, "submission-mode:photo-preferred"],
    difficulty: "hard",
    estimatedMinutes: 30,
    points: 20,
    preferredSubmissionMode: "photo",
  },
  {
    ordinal: 2,
    sectionTitle: "第2問 古文",
    questionType: "essay",
    questionText:
      "次の古文(課題本文を参照)について、傍線部「いとはかなくも見ゆるかな」の解釈を、主体・対象を明示して50字以内で記しなさい。",
    rubric: {
      type: "essay",
      number: "2",
      points: 15,
      rubricElements: [
        { element: "主語(感情の主体)を本文から正しく特定している", points: 4 },
        { element: "「はかなし」の語義を文脈に応じて適切に解釈", points: 4 },
        { element: "傍線部の対象(誰・何の何が儚いか)を具体化している", points: 4 },
        { element: "50字以内の字数制限を遵守し、敬語の主体関係を反映", points: 3 },
      ],
      modelAnswer:
        "源氏は若紫の幼さと頼りなさを目の当たりにし、この世のすべての縁の儚さを重ねて感じ入っている。",
    },
    modelAnswer: "(see rubric.modelAnswer)",
    topicTags: ["seed:utokyo-2026", SLUG, `seed:utokyo-2026:${SLUG}:2`],
    difficulty: "hard",
    estimatedMinutes: 25,
    points: 15,
  },
  {
    ordinal: 3,
    sectionTitle: "第3問 漢文",
    questionType: "essay",
    questionText:
      "次の漢文(課題本文を参照)を訓読し、傍線部の意義について40字以内で説明しなさい。",
    rubric: {
      type: "essay",
      number: "3",
      points: 15,
      rubricElements: [
        { element: "訓点・送り仮名を踏まえた訓読が概ね正確である", points: 5 },
        { element: "傍線部の語句の意味を漢文の論旨に即して捉えている", points: 4 },
        { element: "歴史的・思想的背景を簡潔に補足している", points: 3 },
        { element: "40字以内の字数制限を遵守している", points: 3 },
      ],
      modelAnswer:
        "君主は私欲を抑えて公益に殉ずべきであり、その姿勢が民の信頼を得る根本だと説いている。",
    },
    modelAnswer: "(see rubric.modelAnswer)",
    topicTags: ["seed:utokyo-2026", SLUG, `seed:utokyo-2026:${SLUG}:3`],
    difficulty: "hard",
    estimatedMinutes: 25,
    points: 15,
  },
];
