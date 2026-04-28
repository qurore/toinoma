import type { QuestionSpec } from "../../types";

const SLUG = "world_history";

export const worldHistoryQuestions: QuestionSpec[] = [
  {
    ordinal: 1,
    sectionTitle: "第1問 大論述",
    questionType: "essay",
    questionText:
      "16世紀から18世紀にかけての大西洋貿易圏の形成と、それがヨーロッパ・アフリカ・アメリカ大陸の社会経済に及ぼした多面的影響について、600字以内で論述しなさい。指定語句:銀、奴隷貿易、重商主義、プランテーション、産業革命の前史。",
    rubric: {
      type: "essay",
      number: "1",
      points: 30,
      rubricElements: [
        { element: "アメリカ大陸からの銀流入と価格革命を欧州経済への影響として記述", points: 5 },
        { element: "三角貿易・奴隷貿易の構造とアフリカ社会への影響を説明", points: 6 },
        { element: "プランテーション体制と砂糖・タバコ生産を論じている", points: 5 },
        { element: "重商主義政策と国家による貿易統制を関連づける", points: 5 },
        { element: "産業革命の前史としての資本蓄積に触れている", points: 4 },
        { element: "指定語句を全て自然に用いている", points: 3 },
        { element: "600字以内・段落構成が論理的", points: 2 },
      ],
      modelAnswer:
        "16世紀以降、ポトシ銀山などからの銀流入は欧州で価格革命を起こし市場経済を拡大させた一方、奴隷貿易を組み込んだ三角貿易は西アフリカ社会から大量の労働力を収奪し、人口・社会構造に深刻な打撃を与えた。新大陸では砂糖・タバコのプランテーション体制が確立し、重商主義のもと欧州諸国は植民地交易を国家的に統制した。これらは資本蓄積を促進し産業革命の前史を形成する一方、世界規模で不平等を構造化した。",
    },
    modelAnswer: "(see rubric.modelAnswer)",
    topicTags: ["seed:utokyo-2026", SLUG, `seed:utokyo-2026:${SLUG}:1`, "submission-mode:photo-preferred"],
    difficulty: "hard",
    estimatedMinutes: 60,
    points: 30,
    preferredSubmissionMode: "photo",
  },
  {
    ordinal: 2,
    sectionTitle: "第2問 小論述",
    questionType: "essay",
    questionText:
      "19世紀のオスマン帝国における「タンジマート改革」の主な目的と限界について、120字以内で説明しなさい。",
    rubric: {
      type: "essay",
      number: "2",
      points: 15,
      rubricElements: [
        { element: "改革の目的(中央集権化・近代化・列強への対抗)を明示", points: 5 },
        { element: "ギュルハネ勅令や法制度改革に言及", points: 4 },
        { element: "改革の限界(財政破綻・諸民族の独立運動)を述べる", points: 4 },
        { element: "120字以内の字数制限を遵守", points: 2 },
      ],
      modelAnswer:
        "ギュルハネ勅令を起点とするタンジマート改革は、法治化・徴税合理化・諸民族の平等を掲げて近代国家化を試みた。しかし財政依存と列強の干渉、諸民族の民族主義運動により、根本的な統合は達成できなかった。",
    },
    modelAnswer: "(see rubric.modelAnswer)",
    topicTags: ["seed:utokyo-2026", SLUG, `seed:utokyo-2026:${SLUG}:2`],
    difficulty: "hard",
    estimatedMinutes: 25,
    points: 15,
  },
  {
    ordinal: 3,
    sectionTitle: "第3問 短答",
    questionType: "essay",
    questionText:
      "1929年に始まった世界恐慌が国際関係に及ぼした主要な影響を、ブロック経済化と全体主義の台頭の2点に整理して80字以内で記しなさい。",
    rubric: {
      type: "essay",
      number: "3",
      points: 15,
      rubricElements: [
        { element: "ブロック経済化(スターリング・フラン・ドル各圏)を具体的に挙げている", points: 5 },
        { element: "全体主義(ナチズム・ファシズム・軍部)の台頭を説明", points: 5 },
        { element: "国際協調体制の崩壊につながった因果関係を示す", points: 3 },
        { element: "80字以内の字数制限を遵守", points: 2 },
      ],
      modelAnswer:
        "各国は植民地・自治領を囲い込むブロック経済へ傾斜して国際貿易が縮小し、経済停滞を背景に独・伊・日で全体主義が台頭、国際協調体制を瓦解させた。",
    },
    modelAnswer: "(see rubric.modelAnswer)",
    topicTags: ["seed:utokyo-2026", SLUG, `seed:utokyo-2026:${SLUG}:3`],
    difficulty: "hard",
    estimatedMinutes: 15,
    points: 15,
  },
];
