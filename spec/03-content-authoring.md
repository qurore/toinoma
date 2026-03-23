# Content Authoring — Detailed Specification

> **Features:** ATH-001 through ATH-038 | **Priority:** Mostly P0

## 1. Overview

Content authoring in Toinoma follows a **Problem Pool → Problem Set** model (differentiator #6). Sellers maintain a pool of individual questions, then compose problem sets by selecting and ordering questions from the pool. This enables question reuse across multiple sets, versioning, and efficient content management.

## 2. Architecture: Pool → Set Model

```
┌─────────────────────────────────────────────┐
│ Problem Pool (per seller)                   │
│                                             │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ │
│  │ Q1  │ │ Q2  │ │ Q3  │ │ Q4  │ │ Q5  │ │
│  │essay│ │mark │ │fill │ │essay│ │ MC  │ │
│  └──┬──┘ └──┬──┘ └──┬──┘ └──┬──┘ └──┬──┘ │
│     │       │       │       │       │     │
└─────┼───────┼───────┼───────┼───────┼─────┘
      │       │       │       │       │
      ▼       ▼       ▼       ▼       ▼
┌───────────────┐  ┌───────────────┐
│ Problem Set A │  │ Problem Set B │
│ ┌───────────┐ │  │ ┌───────────┐ │
│ │Section 1  │ │  │ │Section 1  │ │
│ │ Q1, Q2    │ │  │ │ Q2, Q5    │ │
│ ├───────────┤ │  │ ├───────────┤ │
│ │Section 2  │ │  │ │Section 2  │ │
│ │ Q3, Q4    │ │  │ │ Q1, Q4    │ │
│ └───────────┘ │  │ └───────────┘ │
│ Price: ¥1,500 │  │ Price: Free  │
│ Status: Pub.  │  │ Status: Draft│
└───────────────┘  └───────────────┘
```

**Key principle:** A question exists once in the pool. It can be included in multiple problem sets. Editing a question in the pool updates it everywhere (version-aware).

## 3. Database Schema (New Tables)

### questions (Problem Pool)
```sql
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES seller_profiles(id),

  -- Content
  question_type answer_type NOT NULL,  -- 'essay', 'mark_sheet', 'fill_in_blank', 'multiple_choice'
  question_text TEXT NOT NULL,          -- Rich text (HTML or Markdown)
  question_images JSONB DEFAULT '[]',  -- Array of image URLs

  -- Answer definition
  rubric JSONB NOT NULL DEFAULT '{}',  -- Type-specific rubric (see rubric schemas below)
  model_answer TEXT,                    -- Rich text model answer
  model_answer_images JSONB DEFAULT '[]',

  -- Metadata
  subject subject NOT NULL,
  topic_tags TEXT[] DEFAULT '{}',       -- Free-text tags for organization
  difficulty difficulty NOT NULL DEFAULT 'medium',
  estimated_minutes INTEGER,            -- Estimated time to solve
  points INTEGER NOT NULL DEFAULT 10,   -- Point value

  -- Media
  video_urls JSONB DEFAULT '[]',        -- Up to 3 video URLs [{url, title, duration_seconds}]

  -- Vertical text
  vertical_text BOOLEAN NOT NULL DEFAULT false,  -- Enable tategaki rendering

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_questions_seller_id ON questions(seller_id);
CREATE INDEX idx_questions_subject ON questions(subject);
CREATE INDEX idx_questions_type ON questions(question_type);
```

### problem_set_questions (Junction: Set ↔ Question)
```sql
CREATE TABLE problem_set_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_set_id UUID NOT NULL REFERENCES problem_sets(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id),

  -- Ordering
  section_number INTEGER NOT NULL DEFAULT 1,   -- 大問 number (1-based)
  section_title TEXT,                           -- e.g., "第1問", "大問1"
  position INTEGER NOT NULL DEFAULT 0,         -- Order within section

  -- Override (optional: override pool question's points for this set)
  points_override INTEGER,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(problem_set_id, question_id)
);

CREATE INDEX idx_psq_problem_set ON problem_set_questions(problem_set_id);
CREATE INDEX idx_psq_question ON problem_set_questions(question_id);
```

### Modify existing problem_sets
```sql
-- Add columns to problem_sets:
ALTER TABLE problem_sets ADD COLUMN cover_image_url TEXT;
ALTER TABLE problem_sets ADD COLUMN time_limit_minutes INTEGER;  -- NULL = no limit
ALTER TABLE problem_sets ADD COLUMN preview_question_ids UUID[] DEFAULT '{}';  -- Questions shown as free preview
ALTER TABLE problem_sets ADD COLUMN total_points INTEGER NOT NULL DEFAULT 0;  -- Auto-calculated

-- The existing rubric JSONB column becomes deprecated
-- Rubrics now live on individual questions
-- Keep for backward compatibility during migration
```

## 4. Question Types & Rubric Schemas

### 4.1 Essay (essay)
```jsonc
{
  "type": "essay",
  "max_characters": 400,           // Optional character limit
  "rubric_elements": [
    {
      "id": "elem-1",
      "description": "Reference to Treaty of Westphalia",
      "points": 3
    },
    {
      "id": "elem-2",
      "description": "Explanation of sovereign state system",
      "points": 4
    },
    {
      "id": "elem-3",
      "description": "Logical coherence",
      "points": 3
    }
  ],
  "grading_notes": "Optional notes for AI grader"
}
```

### 4.2 Mark Sheet (mark_sheet)
```jsonc
{
  "type": "mark_sheet",
  "choices": ["ア", "イ", "ウ", "エ", "オ"],  // or ["1","2","3","4","5"]
  "correct_answers": ["ア"],                     // Array for multi-select
  "scoring_mode": "all_or_nothing",              // or "partial"
  "groups": [                                    // Optional: grouped questions
    {
      "label": "(1)",
      "correct": ["イ"],
      "points": 3
    },
    {
      "label": "(2)",
      "correct": ["ア", "エ"],
      "points": 4
    }
  ]
}
```

### 4.3 Fill-in-the-Blank (fill_in_blank)
```jsonc
{
  "type": "fill_in_blank",
  "blanks": [
    {
      "id": "blank-1",
      "label": "(1)",
      "acceptable_answers": ["平安時代", "へいあんじだい"],  // Multiple acceptable forms
      "case_sensitive": false,
      "normalize_width": true,    // Normalize full-width ↔ half-width
      "points": 2
    },
    {
      "id": "blank-2",
      "label": "(2)",
      "acceptable_answers": ["794"],
      "points": 2
    }
  ]
}
```

### 4.4 Multiple Choice (multiple_choice)
```jsonc
{
  "type": "multiple_choice",
  "options": [
    { "id": "a", "text": "Option A text", "image_url": null },
    { "id": "b", "text": "Option B text", "image_url": null },
    { "id": "c", "text": "Option C text", "image_url": null },
    { "id": "d", "text": "Option D text", "image_url": null }
  ],
  "correct_option_ids": ["b"],       // Array for multi-select
  "select_mode": "single",           // "single" or "multiple"
  "scoring_mode": "all_or_nothing"   // or "partial" for multi-select
}
```

## 5. Question Creation Interface (ATH-002 to ATH-006)

### Layout
```
┌─────────────────────────────────────────────────┐
│ Create Question                          [Save] │
├──────────────────────┬──────────────────────────┤
│ Editor               │ Preview                  │
│                      │                          │
│ Type: [Essay ▼]      │ (Live preview of         │
│                      │  question as student     │
│ Question Text:       │  will see it)            │
│ ┌──────────────────┐ │                          │
│ │ Rich text editor │ │                          │
│ │ [B][I][U][LaTeX] │ │                          │
│ │ [Image][Table]   │ │                          │
│ │                  │ │                          │
│ └──────────────────┘ │                          │
│                      │                          │
│ [Rubric Section]     │                          │
│ ┌──────────────────┐ │                          │
│ │ + Add element    │ │                          │
│ │ Element 1: [  ]  │ │                          │
│ │ Points: [3]      │ │                          │
│ └──────────────────┘ │                          │
│                      │                          │
│ Model Answer:        │                          │
│ ┌──────────────────┐ │                          │
│ │ Rich text editor │ │                          │
│ └──────────────────┘ │                          │
│                      │                          │
│ Metadata:            │                          │
│ Subject: [Math ▼]    │                          │
│ Difficulty: [Medium] │                          │
│ Points: [10]         │                          │
│ Tags: [tag1, tag2]   │                          │
│                      │                          │
│ Videos (0/3):        │                          │
│ [+ Upload video]     │                          │
├──────────────────────┴──────────────────────────┤
│ [Cancel]                    [Save as Draft]     │
└─────────────────────────────────────────────────┘
```

### Rich Text Editor Requirements
- Bold, italic, underline, strikethrough
- Ordered/unordered lists
- Tables (for data-based questions)
- Image insertion (upload + inline display)
- LaTeX math formulas (inline `$...$` and block `$$...$$`)
- Furigana (ruby text) support
- Code blocks (for programming-related questions)
- Vertical text toggle (for kokugo)

### Type-Specific UI

**Essay:**
- Question text editor
- Character limit input (optional)
- Rubric elements: list of criterion + points (add/remove/reorder)
- Model answer editor

**Mark Sheet:**
- Question text editor
- Choice set selector (ア-オ, 1-5, A-E, custom)
- Correct answer selector (click to select)
- Grouped scoring toggle (add sub-groups)

**Fill-in-the-Blank:**
- Question text editor with `[___]` blank insertion button
- Per blank: label, acceptable answers (add variants), points
- Normalization toggles (case, width)

**Multiple Choice:**
- Question text editor
- Options editor: text + optional image per option
- Correct answer selector (radio for single, checkbox for multi)
- Scoring mode toggle

## 6. Problem Set Composition (ATH-016 to ATH-023)

### Composition Flow
1. Click "新規問題セット" on seller dashboard
2. Set metadata: title, description, subject, university, difficulty
3. **Question Selection Panel:** browse/search problem pool on the left, drag questions to sections on the right
4. **Section Management:** add/remove/rename sections (大問1, 大問2, ...)
5. **Question Ordering:** drag-and-drop within sections
6. Set pricing (¥0 for free, or JPY amount)
7. Configure preview questions (1-2 questions visible to non-purchasers)
8. Set optional time limit
9. Upload cover image (or auto-generate)
10. Save as draft or publish

### Composition UI
```
┌─────────────────────────────────────────────────┐
│ New Problem Set                                  │
├──────────────────────┬──────────────────────────┤
│ Question Pool        │ Problem Set Structure     │
│                      │                          │
│ Search: [________]   │ Title: [____________]    │
│ Subject: [All ▼]     │ Subject: [Math ▼]        │
│ Type: [All ▼]        │                          │
│                      │ ┌ Section 1: 大問1 ────┐ │
│ ┌──────────────────┐ │ │ Q: Quadratic eq. (10pt)│
│ │ Q: Quadratic eq. │ │ │ Q: Derivatives  (15pt)│
│ │ essay | math     │→│ └─────────────────────┘ │
│ │ [10pt] [+Add]    │ │                          │
│ ├──────────────────┤ │ ┌ Section 2: 大問2 ────┐ │
│ │ Q: Tokugawa era  │ │ │ Q: Probability  (20pt)│
│ │ fill | history   │ │ └─────────────────────┘ │
│ │ [5pt] [+Add]     │ │                          │
│ ├──────────────────┤ │ [+ Add Section]           │
│ │ Q: Probability   │ │                          │
│ │ MC | math        │ │ Total: 45 points         │
│ │ [20pt] [+Add]    │ │ Questions: 3             │
│ └──────────────────┘ │ Time Limit: [60] min     │
│                      │ Price: [1500] JPY        │
│ Page 1/3 [< >]      │                          │
├──────────────────────┴──────────────────────────┤
│ [Save Draft]              [Preview] [Publish]   │
└─────────────────────────────────────────────────┘
```

### Publish Validation (ATH-038)
Before allowing publish, validate:
- [ ] At least 1 question in the set
- [ ] All questions have rubrics defined
- [ ] Total points > 0
- [ ] Title is not empty
- [ ] Subject is selected
- [ ] If price > 0: seller has completed Stripe Connect
- [ ] Each section has at least 1 question
- [ ] No orphaned sections (empty sections)

## 7. AI-Powered PDF Import (ATH-024)

### Flow
1. Seller uploads a PDF file (exam paper)
2. System sends PDF to AI (Google Generative AI) with extraction prompt
3. AI returns structured data: questions, answer types, model answers
4. Seller reviews extracted questions in an editable preview
5. Seller confirms → questions added to problem pool
6. Seller can edit any extracted question before confirmation

### AI Extraction Prompt Strategy
```
System: You are an exam paper parser. Extract questions from the uploaded exam PDF.
For each question, determine:
1. Question text (preserve formatting, math notation)
2. Question type (essay, mark_sheet, fill_in_blank, multiple_choice)
3. Answer options (if applicable)
4. Model answer (if answer key is included)
5. Suggested rubric elements (for essays)
6. Point value (if indicated)
7. Subject classification
8. Difficulty estimation

Return as structured JSON.
```

### UI
```
┌─────────────────────────────────────────────────┐
│ Import from PDF                                  │
├─────────────────────────────────────────────────┤
│ ┌───────────────────────────────────────────┐   │
│ │ Drop PDF here or click to upload          │   │
│ │ Supported: PDF (max 50MB)                 │   │
│ └───────────────────────────────────────────┘   │
│                                                  │
│ [After upload + AI processing:]                  │
│                                                  │
│ Extracted 5 questions                            │
│                                                  │
│ ☑ Q1: [Essay] "Explain the causes of..."  [Edit]│
│ ☑ Q2: [MC]    "Select the correct..."     [Edit]│
│ ☑ Q3: [Fill]  "The year ___ marked..."    [Edit]│
│ ☑ Q4: [Essay] "Compare and contrast..."   [Edit]│
│ ☐ Q5: [Mark]  "Choose all that apply..."  [Edit]│
│                                                  │
│ [Import Selected (4)]        [Cancel]            │
└─────────────────────────────────────────────────┘
```

### Acceptance Criteria
- [ ] PDF upload with drag-and-drop support
- [ ] Progress indicator during AI processing
- [ ] Extracted questions displayed with type, preview text
- [ ] Each question editable before import
- [ ] Select/deselect individual questions
- [ ] Imported questions added to seller's problem pool
- [ ] Error handling for unparseable PDFs
- [ ] Maximum PDF size: 50MB

## 8. Video Attachment (ATH-011, ATH-012)

### Description
Sellers can attach up to 3 explanation videos per question. Videos are displayed in review mode after a student submits and receives grading.

### Storage
- Upload to Supabase Storage bucket: `question-videos`
- Path: `/{seller_id}/{question_id}/{filename}`
- Max file size: 500MB per video
- Supported formats: mp4, webm
- Upload with progress indicator

### Video Metadata
```jsonc
// Stored in questions.video_urls JSONB
[
  {
    "url": "https://xxx.supabase.co/storage/v1/object/public/question-videos/...",
    "title": "解法のポイント",
    "duration_seconds": 180,
    "uploaded_at": "2026-03-23T..."
  }
]
```

### Acceptance Criteria
- [ ] Upload up to 3 videos per question
- [ ] Upload progress indicator
- [ ] Video preview (thumbnail + play button) in question editor
- [ ] Remove video option
- [ ] Reorder videos (drag-and-drop)
- [ ] Video player in review mode (after student submission)
- [ ] Seller can add title per video
- [ ] Duration auto-detected from file

## 9. LaTeX Support (ATH-014)

### Implementation
- Use **KaTeX** for rendering (fastest, pure JS)
- Inline: `$x^2 + y^2 = z^2$` → renders inline
- Block: `$$\int_0^1 f(x) dx$$` → renders centered block
- Supported in: question text, model answer, rubric descriptions, student essay answers

### Editor Integration
- LaTeX toolbar button in rich text editor
- LaTeX input modal: type formula → live preview → insert
- Or: type `$...$` directly in editor → auto-renders in preview

## 10. Vertical Text Support (ATH-015)

### Implementation
- Toggle on question creation form: "縦書き表示" checkbox
- When enabled, question text and answer area render with `writing-mode: vertical-rl`
- Affects: question display, answer input area, PDF export
- Used primarily for Japanese (kokugo) questions
- Font: appropriate for vertical text (e.g., Noto Serif JP)

### CSS
```css
.vertical-text {
  writing-mode: vertical-rl;
  text-orientation: mixed;
  /* Horizontal-in-vertical for numbers and Latin */
  & .tcy {
    text-combine-upright: all;
  }
}
```
