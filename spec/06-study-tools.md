# Study Tools — Detailed Specification

> **Features:** STD-001 through STD-022 | **Priority:** P0-P2

## 1. Overview

Study tools enable students to maximize learning from purchased problem sets. Core features: review mode with explanations and videos, custom collections for focused study, PDF export for offline practice, and performance analytics.

## 2. Review Mode (STD-001 to STD-003)

### URL: `/problem/[id]/result/[sid]`

Review mode is accessed after grading. It displays:
1. Student's answer alongside the correct/model answer
2. Per-element rubric feedback (for essays)
3. Correct/incorrect marking (for objective types)
4. Seller's explanation videos (if attached)
5. Model answer (toggleable visibility)

### Per-Type Review Display

**Essay:**
```
問1 (記述式) — 8/10点

あなたの解答:
[Student's answer text displayed here]

採点結果:
✅ ウェストファリア条約への言及 (3/3)
🟡 主権国家体制の説明 (2/4)
   → 「条約について言及されていますが、主権国家体制の形成過程の詳細が不足しています」
✅ 論理的一貫性 (3/3)

模範解答: [Toggle: 表示/非表示]
[Model answer text]

📹 解説動画 (2本)
[Video 1: 解法のポイント] [▶ Play]
[Video 2: 関連知識の整理] [▶ Play]
```

**Mark-Sheet:**
```
問2 (マーク式) — 5/5点

  あなた   正解
(1)  イ   →  イ  ✅
(2)  ア   →  ウ  ❌  正解: ウ
(3)  エ   →  エ  ✅
```

**Fill-in-Blank:**
```
問3 (穴埋め) — 8/10点

(1) [平安時代] → 平安時代 ✅ (2/2)
(2) [794年]   → 794     ✅ (2/2)
(3) [鎌倉]    → 鎌倉    ✅ (2/2)
(4) [源頼朝]  → 源頼朝  ✅ (2/2)
(5) [建武]    → 建武の新政 ❌ (0/2) — 正解: 建武の新政
```

**Multiple Choice:**
```
問4 (選択式) — 3/3点

あなたの選択: ウ ✅
正解: ウ. 「織田信長が桶狭間の戦いで今川義元を破った」
```

## 3. Custom Collections (STD-004 to STD-007)

### Overview
Students can create personal study collections by pulling individual questions from purchased problem sets. This enables:
- Focused practice on weak areas
- Cross-set study (questions from different sets in one collection)
- Review-specific collections (e.g., "math mistakes to review")

### Database Schema
```sql
-- Existing tables (already created):
-- collections (id, user_id, name, description, created_at, updated_at)
-- collection_items (id, collection_id, problem_set_id, position, created_at)

-- Modify collection_items to support individual questions:
ALTER TABLE collection_items ADD COLUMN question_id UUID REFERENCES questions(id);
-- Now items can reference either a problem_set_id (full set) or question_id (individual question)
-- One of problem_set_id or question_id must be non-null
```

### Collection Management UI (`/dashboard/collections`)
```
┌─────────────────────────────────────────────────┐
│ My Collections                    [+ New]       │
├─────────────────────────────────────────────────┤
│                                                  │
│ ┌──────────────────────────────────────────┐    │
│ │ 📁 数学の苦手問題                        │    │
│ │    12問 | 最終学習: 3日前                 │    │
│ │    [学習する] [編集]                      │    │
│ ├──────────────────────────────────────────┤    │
│ │ 📁 世界史 重要語句                        │    │
│ │    25問 | 最終学習: 1日前                 │    │
│ │    [学習する] [編集]                      │    │
│ ├──────────────────────────────────────────┤    │
│ │ 📁 英語長文読解                           │    │
│ │    8問 | 最終学習: 5日前                  │    │
│ │    [学習する] [編集]                      │    │
│ └──────────────────────────────────────────┘    │
│                                                  │
└─────────────────────────────────────────────────┘
```

### Add to Collection Flow
From review mode or problem set detail:
1. Click "コレクションに追加" on a question
2. Popover shows existing collections + "新規作成"
3. Select collection → question added
4. Toast: "コレクションに追加しました"

### Collection Solving
- Same solving interface as problem sets
- Questions from the collection displayed in order (or shuffled)
- Grading works per-question (same AI engine)
- Results stored as a collection submission

## 4. PDF Export (STD-012 to STD-015)

### Export Options
| Option | Content | Use Case |
|--------|---------|----------|
| Problems only | Question text, diagrams, blank answer spaces | Print for timed practice |
| Answers only | Answer sheet template (blank mark-sheet, fill-in lines) | Separate answer sheet |
| Problems + Answers | Questions followed by model answers | Self-study reference |

### PDF Generation
- Server-side PDF generation using `@react-pdf/renderer` or `puppeteer`
- A4 paper size (210mm x 297mm)
- Configurable margins (narrow 15mm / normal 25mm / wide 30mm)
- Page breaks between sections (大問)
- Header: problem set title, subject, page number
- Footer: "Toinoma — toinoma.jp"
- Vertical text for kokugo problems (CSS writing-mode in PDF)
- LaTeX rendered as images in PDF

### PDF Download Flow
1. Student clicks "PDFをダウンロード" on purchased problem set
2. Select export type (problems / answers / both)
3. Server generates PDF (may take 2-5 seconds)
4. Download starts automatically
5. Toast: "PDFをダウンロードしました"

### Print-Friendly Formatting
- Serif font for body text (Noto Serif JP)
- Sans-serif for headers (Noto Sans JP)
- High contrast black/white (no color in print)
- Images embedded at appropriate resolution (300 DPI)
- Tables properly formatted with borders
- Math formulas rendered as vector graphics

## 5. Progress Tracking (STD-008)

### Dashboard Widget
Per purchased problem set:
```
┌──────────────────────────────────────────┐
│ [Title]                    Best: 92/100  │
│ ████████████████████░░ 85%               │
│ 5 attempts | Last: 2026-03-20            │
│ [Continue] [Review Best] [History]       │
└──────────────────────────────────────────┘
```

### Data Points
- Total attempts
- Best score (with date)
- Last score (with date)
- Completion percentage (best score / total points)
- Time to complete average

## 6. Performance Analytics (STD-009)

### URL: `/dashboard/analytics`

### Visualizations
1. **Score Trend:** Line chart of scores over time (all submissions)
2. **By Subject:** Radar/spider chart of average scores per subject
3. **By Difficulty:** Bar chart comparing easy/medium/hard averages
4. **Strengths & Weaknesses:** Top 3 strongest and weakest topics
5. **Study Streak:** Calendar heatmap (like GitHub contribution graph)

### Data
- Aggregated from `submissions` table
- Minimum 3 submissions to show meaningful analytics
- Empty state: "もっと問題を解いて、分析データを蓄積しましょう"

## 7. Score Comparison (STD-019)

### Available Comparisons
| Comparison | Description | Display |
|------------|-------------|---------|
| Previous attempts | Your scores across attempts | Line chart |
| All students | Average score of all students on this set | "Average: 65/100" |
| Top 10% | Score threshold for top 10% | "Top 10%: 88/100" |
| Percentile | Your percentile rank | "You scored better than 72% of students" |

### Privacy
- Aggregate stats only (no individual student data exposed)
- Minimum 5 submissions before showing comparison data
- Anonymous aggregation

## 8. Submission History (STD-020, STD-021)

### `/dashboard/history`
- All submissions across all problem sets
- Columns: Problem Set, Subject, Score, Date, Duration
- Filter: by subject, date range, score range
- Sort: by date, score
- Click row → view full submission detail (review mode)

### Per-Set History (`/problem/[id]/history`)
- All attempts for a specific problem set
- Score trend chart
- Per-attempt comparison (which questions improved/regressed)
