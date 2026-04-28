import type { QuestionSpec } from "../../types";

const SLUG = "geography";

export const geographyQuestions: QuestionSpec[] = [
  {
    ordinal: 1,
    sectionTitle: "第1問 自然地理",
    questionType: "essay",
    questionText:
      "プレートテクトニクスの観点から、日本列島で地震・火山活動が活発である理由を120字以内で説明しなさい。",
    rubric: {
      type: "essay",
      number: "1",
      points: 20,
      rubricElements: [
        { element: "4枚のプレート(太平洋・フィリピン海・北米・ユーラシア)の収束を示す", points: 6 },
        { element: "海溝・沈み込み帯と地震発生メカニズムを関連づける", points: 5 },
        { element: "マグマ生成と火山フロントの形成を説明", points: 5 },
        { element: "120字以内の字数制限を遵守", points: 4 },
      ],
      modelAnswer:
        "日本列島は太平洋・フィリピン海プレートが北米・ユーラシアプレートの下に沈み込む収束帯に位置し、海溝沿いでプレート境界地震が、また沈み込みに伴うマグマ生成で火山フロントが形成されるため、地震・火山活動がきわめて活発である。",
    },
    modelAnswer: "(see rubric.modelAnswer)",
    topicTags: ["seed:utokyo-2026", SLUG, `seed:utokyo-2026:${SLUG}:1`, "submission-mode:photo-preferred"],
    difficulty: "medium",
    estimatedMinutes: 25,
    points: 20,
    preferredSubmissionMode: "photo",
  },
  {
    ordinal: 2,
    sectionTitle: "第2問 人文地理(統計表)",
    questionType: "mark_sheet",
    questionText:
      "次の統計表(課題資料を参照)は、A〜D 国の総人口・都市人口比率・一人あたりGDPを示している。各指標の組合せから D 国に該当する国を1つ選びなさい。",
    rubric: {
      type: "mark_sheet",
      number: "2",
      points: 8,
      correctAnswer: "B",
      choices: [
        "A. 日本",
        "B. インド",
        "C. ドイツ",
        "D. ナイジェリア",
      ],
    },
    modelAnswer: "B",
    topicTags: ["seed:utokyo-2026", SLUG, `seed:utokyo-2026:${SLUG}:2`],
    difficulty: "medium",
    estimatedMinutes: 8,
    points: 8,
  },
  {
    ordinal: 3,
    sectionTitle: "第3問 地誌",
    questionType: "essay",
    questionText:
      "サブサハラ・アフリカにおけるモノカルチャー経済の形成過程と現代における脆弱性について、植民地史的経緯を踏まえ150字以内で論述しなさい。",
    rubric: {
      type: "essay",
      number: "3",
      points: 18,
      rubricElements: [
        { element: "植民地期のプランテーション経済の導入を説明", points: 5 },
        { element: "独立後も特定一次産品依存が継続した経緯を述べる", points: 5 },
        { element: "国際価格変動・気候変動への脆弱性を指摘", points: 5 },
        { element: "150字以内の字数制限を遵守", points: 3 },
      ],
      modelAnswer:
        "植民地期に欧州諸国がカカオ・コーヒー等の換金作物プランテーションを導入し、独立後も輸出先と労働構造が固定化されてモノカルチャーが残存した。一次産品依存は国際相場や気候変動に左右されやすく、外貨収入と食料安全保障の双方で脆弱性が残る。",
    },
    modelAnswer: "(see rubric.modelAnswer)",
    topicTags: ["seed:utokyo-2026", SLUG, `seed:utokyo-2026:${SLUG}:3`],
    difficulty: "medium",
    estimatedMinutes: 25,
    points: 18,
  },
];
