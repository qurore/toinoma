import type { QuestionSpec } from "../../types";

const SLUG = "japanese_history";

export const japaneseHistoryQuestions: QuestionSpec[] = [
  {
    ordinal: 1,
    sectionTitle: "第1問 古代",
    questionType: "essay",
    questionText:
      "課題資料群を読み、律令体制成立期(7〜8世紀)における中央官制と地方支配の関係について、150字以内で論述しなさい。",
    rubric: {
      type: "essay",
      number: "1",
      points: 25,
      rubricElements: [
        { element: "二官八省や太政官の役割を踏まえている", points: 6 },
        { element: "国司・郡司による地方支配の構造を説明", points: 7 },
        { element: "中央と地方を結ぶ行政・財政システム(調・庸など)に言及", points: 6 },
        { element: "資料群の用例を1つ以上引用", points: 3 },
        { element: "150字以内の字数制限を遵守", points: 3 },
      ],
      modelAnswer:
        "律令制下では太政官が政策を決定し八省が分掌、地方には国司を派遣して郡司を統括させ、戸籍と班田収授に基づく調・庸の徴収を通じて中央財政が成立した。中央集権と在地支配層の温存が並立する点が特徴である。",
    },
    modelAnswer: "(see rubric.modelAnswer)",
    topicTags: ["seed:utokyo-2026", SLUG, `seed:utokyo-2026:${SLUG}:1`, "submission-mode:photo-preferred"],
    difficulty: "hard",
    estimatedMinutes: 20,
    points: 25,
    preferredSubmissionMode: "photo",
  },
  {
    ordinal: 2,
    sectionTitle: "第2問 中世",
    questionType: "essay",
    questionText:
      "鎌倉幕府の御家人制度について、御恩と奉公の関係に注目して120字以内で説明しなさい。",
    rubric: {
      type: "essay",
      number: "2",
      points: 20,
      rubricElements: [
        { element: "御恩(本領安堵・新恩給与)を具体的に説明", points: 5 },
        { element: "奉公(軍役・京都大番役など)を具体的に説明", points: 5 },
        { element: "両者を相互義務関係として位置づけている", points: 5 },
        { element: "120字以内の字数制限を遵守", points: 3 },
        { element: "幕府と将軍権力を支える基盤として記述", points: 2 },
      ],
      modelAnswer:
        "将軍が御家人に本領安堵や新恩を与える「御恩」に対し、御家人は軍役や京都大番役などの「奉公」で応えるという双務的契約関係を結ぶ。これが鎌倉幕府の支配秩序を支える根幹であった。",
    },
    modelAnswer: "(see rubric.modelAnswer)",
    topicTags: ["seed:utokyo-2026", SLUG, `seed:utokyo-2026:${SLUG}:2`],
    difficulty: "hard",
    estimatedMinutes: 20,
    points: 20,
  },
  {
    ordinal: 3,
    sectionTitle: "第3問 近世",
    questionType: "essay",
    questionText:
      "江戸幕府による寺社統制の主な手段とその目的について、120字以内で論述しなさい。",
    rubric: {
      type: "essay",
      number: "3",
      points: 20,
      rubricElements: [
        { element: "本山末寺制・寺請制度・諸宗寺院法度などの具体策を挙げている", points: 6 },
        { element: "宗教を社会統制の手段として用いた目的を説明", points: 5 },
        { element: "キリスト教禁圧との関連を述べている", points: 5 },
        { element: "120字以内の字数制限を遵守", points: 4 },
      ],
      modelAnswer:
        "幕府は諸宗寺院法度や本山末寺制で宗派を体系化し、寺請制度で民衆を寺院に登録させた。これにより禁教の徹底と地域社会の戸籍把握を同時に果たし、宗教を統治装置として活用した。",
    },
    modelAnswer: "(see rubric.modelAnswer)",
    topicTags: ["seed:utokyo-2026", SLUG, `seed:utokyo-2026:${SLUG}:3`],
    difficulty: "hard",
    estimatedMinutes: 20,
    points: 20,
  },
  {
    ordinal: 4,
    sectionTitle: "第4問 近現代",
    questionType: "essay",
    questionText:
      "1870〜80年代の地租改正がもたらした社会経済的影響について、土地所有関係と農村財政の両面から100字以内で論述しなさい。",
    rubric: {
      type: "essay",
      number: "4",
      points: 15,
      rubricElements: [
        { element: "地券による近代的所有権の確立を説明", points: 4 },
        { element: "金納化が農村財政に与えた影響を述べている", points: 4 },
        { element: "豪農・寄生地主の台頭につながった点を指摘", points: 4 },
        { element: "100字以内の字数制限を遵守", points: 3 },
      ],
      modelAnswer:
        "地券交付により近代的私有権が確立し、地租の金納化で農村は貨幣経済に組み込まれた。一方で凶作時の納税負担が小作化を加速させ、豪農・寄生地主の台頭と農村の階層分化を招いた。",
    },
    modelAnswer: "(see rubric.modelAnswer)",
    topicTags: ["seed:utokyo-2026", SLUG, `seed:utokyo-2026:${SLUG}:4`],
    difficulty: "hard",
    estimatedMinutes: 20,
    points: 15,
  },
];
