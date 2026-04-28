import type { QuestionSpec } from "../../types";

const SLUG = "japanese_humanities";

export const japaneseHumanitiesQuestions: QuestionSpec[] = [
  {
    ordinal: 1,
    sectionTitle: "第1問 現代文(評論)",
    questionType: "essay",
    questionText:
      "次の評論文(課題本文を参照)を読み、筆者が論じる「公共性の動的な再構成」について、本文の論旨に基づき100字以内で要約しなさい。",
    rubric: {
      type: "essay",
      number: "1",
      points: 25,
      rubricElements: [
        { element: "「公共性」を制度ではなく動態として捉える視点を示している", points: 7 },
        { element: "再構成の主体や場(対話・係争)を具体化している", points: 6 },
        { element: "本文の主要キーワードを少なくとも3つ用いている", points: 5 },
        { element: "100字以内の字数制限を遵守", points: 4 },
        { element: "結論部に展望が含まれている", points: 3 },
      ],
      modelAnswer:
        "公共性は固定的制度ではなく、市民の異論や対立が公共空間で交わされる過程で絶えず更新される動的秩序であり、再構成は係争を通じた合意形成の更新運動として理解されると筆者は論ずる。",
    },
    modelAnswer: "(see rubric.modelAnswer)",
    topicTags: ["seed:utokyo-2026", SLUG, `seed:utokyo-2026:${SLUG}:1`, "submission-mode:photo-preferred"],
    difficulty: "hard",
    estimatedMinutes: 35,
    points: 25,
    preferredSubmissionMode: "photo",
  },
  {
    ordinal: 2,
    sectionTitle: "第2問 現代文(随想)",
    questionType: "essay",
    questionText:
      "次の随想(課題本文を参照)の傍線部「沈黙が言葉になる瞬間」とはどのような事態を指すか、本文に即して80字以内で説明しなさい。",
    rubric: {
      type: "essay",
      number: "2",
      points: 20,
      rubricElements: [
        { element: "「沈黙」と「言葉」の対比構造を捉えている", points: 6 },
        { element: "「瞬間」の前後の文脈を踏まえた解釈となっている", points: 5 },
        { element: "比喩を自分の言葉で言い換えている", points: 5 },
        { element: "80字以内の字数制限を遵守", points: 4 },
      ],
      modelAnswer:
        "話者が長年抱えながら言語化を避けてきた感情や記憶が、ある場面で自他にとって意味を持つ言葉として外へ立ち現れる契機の到来を指す。",
    },
    modelAnswer: "(see rubric.modelAnswer)",
    topicTags: ["seed:utokyo-2026", SLUG, `seed:utokyo-2026:${SLUG}:2`],
    difficulty: "hard",
    estimatedMinutes: 25,
    points: 20,
  },
  {
    ordinal: 3,
    sectionTitle: "第3問 古文",
    questionType: "essay",
    questionText:
      "次の古文(課題本文を参照)を読み、傍線部「世の常ならぬ心地す」がどのような心情を指すか、登場人物の関係に注目して70字以内で説明しなさい。",
    rubric: {
      type: "essay",
      number: "3",
      points: 20,
      rubricElements: [
        { element: "「世の常ならぬ」の解釈が文脈に即している", points: 5 },
        { element: "心情の主体と対象が登場人物の関係から明示", points: 5 },
        { element: "敬語(尊敬・謙譲)から主体関係を読み取れている", points: 5 },
        { element: "70字以内の字数制限を遵守", points: 5 },
      ],
      modelAnswer:
        "幼少より共に育った相手が自分の知らぬ世界に身を置き始めたことに気づき、近しさと隔たりが入り交じる切なさを覚えている。",
    },
    modelAnswer: "(see rubric.modelAnswer)",
    topicTags: ["seed:utokyo-2026", SLUG, `seed:utokyo-2026:${SLUG}:3`],
    difficulty: "hard",
    estimatedMinutes: 30,
    points: 20,
  },
  {
    ordinal: 4,
    sectionTitle: "第4問 漢文",
    questionType: "essay",
    questionText:
      "次の漢文(課題本文を参照)を訓読し、傍線部の主張について筆者の立場を明らかにしながら60字以内で説明しなさい。",
    rubric: {
      type: "essay",
      number: "4",
      points: 15,
      rubricElements: [
        { element: "訓読が文法的に妥当である", points: 4 },
        { element: "傍線部における筆者の立場を端的に示している", points: 4 },
        { element: "対比される他者や反論を簡潔に言及", points: 4 },
        { element: "60字以内の字数制限を遵守", points: 3 },
      ],
      modelAnswer:
        "形式ばかりの礼を尚ぶ風潮を批判し、内なる誠実こそが礼の本義だと筆者は強く主張している。",
    },
    modelAnswer: "(see rubric.modelAnswer)",
    topicTags: ["seed:utokyo-2026", SLUG, `seed:utokyo-2026:${SLUG}:4`],
    difficulty: "hard",
    estimatedMinutes: 30,
    points: 15,
  },
];
