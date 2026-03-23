# Solving & Grading — Detailed Specification

> **Features:** SLV-001 through SLV-028 | **Priority:** Mostly P0

## 1. Overview

The solving interface is the core student experience. It mirrors real Japanese university entrance exams: **separate problem sheet and answer sheet** (differentiator #11). After submission, the AI grading engine processes answers and returns scores with detailed feedback, including **partial credit for essay answers** (differentiator #1).

## 2. Solving Interface Layout (SLV-001 to SLV-006)

### Desktop Layout
```
┌─────────────────────────────────────────────────────────────┐
│ AppNavbar                                                    │
├─────────────────────────────────────────────────────────────┤
│ Problem: [Set Title]         Timer: 45:23    Q: 3/15 ━━━○  │
├────────────────────────────┬────────────────────────────────┤
│ Problem Sheet (Read-Only)  │ Answer Sheet (Interactive)      │
│                            │                                │
│ 【大問1】                   │ 大問1                          │
│                            │                                │
│ 問1. 次の文章を読んで...    │ 問1. [________________]       │
│                            │      [________________]       │
│ (long text content)        │      [________________]       │
│                            │      残り: 342/400文字         │
│                            │                                │
│ 問2. 下線部(ア)の...       │ 問2. ○ア ○イ ○ウ ○エ          │
│                            │                                │
│ 問3. 空欄に入る語句を...    │ 問3. (1) [________]           │
│                            │      (2) [________]           │
│                            │                                │
│ 【大問2】                   │ 大問2                          │
│                            │                                │
│ 問4. 次のグラフについて...   │ 問4.                          │
│ [Graph Image]              │ [________________]             │
│                            │ [________________]             │
│                            │                                │
│                            │                                │
│ ← scrollable              │                    scrollable → │
├────────────────────────────┴────────────────────────────────┤
│ [Save Draft]    Question Nav: ①②③④⑤⑥...     [Submit]      │
└─────────────────────────────────────────────────────────────┘
```

### Mobile Layout
```
┌──────────────────────┐
│ AppNavbar             │
├──────────────────────┤
│ [問題] [解答] (tabs) │
├──────────────────────┤
│ (Active tab content) │
│                      │
│ If "問題" tab:       │
│ Problem sheet        │
│ (read-only, scroll)  │
│                      │
│ If "解答" tab:       │
│ Answer sheet         │
│ (interactive inputs) │
│                      │
│                      │
│                      │
├──────────────────────┤
│ Q: 3/15   [Submit]   │
└──────────────────────┘
```

### Key UI Elements

**Problem Sheet (Left/Tab 1):**
- Read-only display of all questions
- Sections clearly delineated (大問1, 大問2, ...)
- Images, tables, LaTeX rendered
- Vertical text for kokugo questions
- Scrollable independently

**Answer Sheet (Right/Tab 2):**
- Interactive inputs per question type
- Essay: multi-line textarea with character count
- Mark-sheet: clickable bubble grid (○ → ●)
- Fill-in-blank: labeled text inputs
- Multiple choice: radio/checkbox inputs
- Character count for essay answers
- Auto-save indicator

**Header Bar:**
- Problem set title
- Timer (countdown if time limit set; elapsed if no limit)
- Progress: "Question 3 of 15" with filled/unfilled dots
- Question navigator: clickable numbered dots (answered = filled, unanswered = outline)

**Footer Bar:**
- Save draft button
- Question navigation strip (scrollable horizontal)
- Submit button (triggers confirmation dialog)

## 3. Answer Input Components

### 3.1 Essay Answer (SLV-003)
```tsx
// Vertical text variant for kokugo
<div className={cn(
  "min-h-[200px] border rounded-md p-4",
  verticalText && "writing-mode-vertical-rl h-[400px] w-auto"
)}>
  <textarea
    className="w-full h-full resize-none"
    maxLength={maxCharacters}
    placeholder="解答を入力してください..."
  />
  <div className="text-sm text-muted-foreground text-right">
    {charCount}/{maxCharacters}文字
  </div>
</div>
```

### 3.2 Mark-Sheet Answer (SLV-004)
Visual bubble grid mimicking real OMR sheets:
```
問1:  ①○  ②○  ③●  ④○  ⑤○    ← click to fill/unfill
問2:  ①○  ②●  ③○  ④○  ⑤○
問3:  ①○  ②○  ③○  ④●  ⑤○
```
- Large touch targets (44px min)
- Visual feedback on selection (filled circle, color change)
- Haptic feedback on mobile
- Grouped questions displayed together

### 3.3 Fill-in-the-Blank Answer (SLV-005)
```
(1) [_____________]
(2) [_____________]
(3) [_____________]
```
- Input fields with labels matching blank positions
- Full-width input for Japanese text
- Validation: required fields

### 3.4 Multiple Choice Answer (SLV-006)
```
○ ア. [Option text]
○ イ. [Option text]
● ウ. [Option text]    ← selected
○ エ. [Option text]
```
- Radio buttons for single select
- Checkboxes for multi-select
- Option text displayed alongside

## 4. Timer (SLV-007)

### Behavior
- **With time limit:** Countdown from set limit (e.g., 60:00 → 0:00)
  - Warning at 5 minutes: timer turns orange
  - Warning at 1 minute: timer turns red + subtle pulse animation
  - At 0:00: auto-submit with confirmation (5-second grace)
- **Without time limit:** Elapsed timer (0:00 → ∞)
  - Counts up, displayed in muted style
- **State persistence:** Timer state saved to localStorage on navigation/tab close
  - Resumes from saved time on return

## 5. Draft Save (SLV-009)

### Auto-Save
- Every 30 seconds if answers changed
- On tab/window blur (beforeunload)
- Save to `submission_drafts` table (or `submissions` with `status: 'draft'`)
- Visual indicator: "保存済み ✓" / "保存中..."

### Manual Save
- "下書き保存" button
- Toast confirmation: "下書きを保存しました"
- Drafts persist across sessions — student can close browser and resume

## 6. Submission Flow (SLV-010)

### Pre-Submit Validation
1. Check for unanswered questions
2. If unanswered: warning dialog listing unanswered question numbers
3. Confirmation dialog: "解答を提出しますか？提出後は変更できません。"
4. Submit button with loading state

### On Submit
1. Create `submissions` record with answers JSONB
2. Queue AI grading (async for essays, sync for objective types)
3. Redirect to grading status / result page
4. If sync grading: show result immediately
5. If async grading (essays): show "採点中..." with estimated time

## 7. AI Grading Engine (SLV-011 to SLV-014)

### Grading Dispatch
```
Submit answers
  ├── For each question:
  │   ├── essay → AI grading (async, 5-30 seconds)
  │   ├── mark_sheet → deterministic grading (instant)
  │   ├── fill_in_blank → deterministic + AI fallback (near-instant)
  │   └── multiple_choice → deterministic grading (instant)
  └── Aggregate scores → store result
```

### 7.1 Essay Grading (SLV-011)
**AI Provider:** Google Generative AI via Vercel AI SDK

**System Prompt Template:**
```
You are an exam grader for Japanese university entrance exams.
Grade the following essay answer based on the provided rubric.

RUBRIC:
{rubric_elements with descriptions and points}

MODEL ANSWER (reference):
{model_answer}

STUDENT ANSWER:
{student_answer}

For each rubric element, evaluate:
1. Whether the element is satisfied (full points)
2. Whether it is partially satisfied (partial points with explanation)
3. Whether it is not addressed (0 points)

Return JSON:
{
  "elements": [
    {
      "element_id": "elem-1",
      "description": "...",
      "max_points": 3,
      "awarded_points": 2,
      "status": "partial",  // "full", "partial", "missing"
      "feedback": "Mentioned the treaty but didn't explain its significance."
    }
  ],
  "total_score": 7,
  "max_score": 10,
  "overall_feedback": "Good understanding of the topic. Consider elaborating on...",
  "improvement_advice": "To improve, focus on..."
}
```

**LaTeX in essays:** Parse LaTeX notation in student answers for math subjects. Verify mathematical correctness step by step.

**Handwritten answers:** If answer is an image (camera capture), use AI Vision to:
1. Extract text from image
2. Grade extracted text using the same rubric
3. Display both original image and extracted text in results

### 7.2 Mark-Sheet Grading (SLV-012)
- Compare selected answers against `rubric.correct_answers`
- **All-or-nothing mode:** Full points if all correct, 0 otherwise
- **Partial mode:** Points proportional to correct selections
- No AI needed — instant computation

### 7.3 Fill-in-the-Blank Grading (SLV-013)
- Compare against `rubric.blanks[].acceptable_answers`
- Normalization: full-width ↔ half-width, trim whitespace
- Case sensitivity configurable per blank
- **AI fallback:** If no exact match, send to AI to check semantic equivalence (e.g., "江戸時代" vs "えどじだい")

### 7.4 Multiple Choice Grading (SLV-014)
- Compare selected options against `rubric.correct_option_ids`
- Same scoring modes as mark-sheet
- Instant computation

## 8. Grading Result Page (SLV-015 to SLV-019)

### Layout
```
┌─────────────────────────────────────────────────┐
│ AppNavbar                                        │
├─────────────────────────────────────────────────┤
│ [Problem Set Title] — Grading Result             │
│                                                  │
│ ┌──────────────────────────────────────────┐    │
│ │         Score: 72 / 100 (72%)            │    │
│ │         ████████████████████░░░░░░       │    │
│ │         Rank: Top 35% | Average: 65/100  │    │
│ └──────────────────────────────────────────┘    │
│                                                  │
│ ⚠ AI採点は参考スコアです。最終判断はご自身で。    │
│                                                  │
│ ┌ Section 1: 大問1 (28/30) ────────────────┐   │
│ │                                           │   │
│ │ Q1 (Essay): 8/10                          │   │
│ │ ┌─────────────────────────────────────┐   │   │
│ │ │ ✅ Treaty of Westphalia (3/3)       │   │   │
│ │ │ 🟡 Sovereign state system (2/4)     │   │   │
│ │ │    "Mentioned but lacked detail"     │   │   │
│ │ │ ✅ Logical coherence (3/3)          │   │   │
│ │ ├─────────────────────────────────────┤   │   │
│ │ │ Your answer: [student text]          │   │   │
│ │ │ Model answer: [model text] (toggle) │   │   │
│ │ │ 📹 Explanation videos (2) [Play]    │   │   │
│ │ └─────────────────────────────────────┘   │   │
│ │                                           │   │
│ │ Q2 (Mark-sheet): 5/5 ✅                   │   │
│ │ Your answer: ウ | Correct: ウ             │   │
│ │                                           │   │
│ │ Q3 (Fill-in): 15/15 ✅                    │   │
│ │ (1) 平安時代 ✅ | (2) 794 ✅              │   │
│ └───────────────────────────────────────────┘   │
│                                                  │
│ 💡 Improvement Advice:                           │
│ "Focus on providing detailed explanations..."    │
│                                                  │
│ [Solve Again] [Add to Collection] [Print PDF]    │
└─────────────────────────────────────────────────┘
```

### Per-Question Feedback Display
| Answer Type | Feedback Display |
|-------------|-----------------|
| Essay | Rubric element breakdown: ✅ full, 🟡 partial (with explanation), ❌ missing |
| Mark-sheet | Your answer vs correct answer. ✅ or ❌ per group |
| Fill-in-blank | Your answer vs correct. ✅ or ❌ per blank |
| Multiple choice | Your selection vs correct. ✅ or ❌ |

### Video Playback in Review (STD-002)
- If question has attached videos, show "📹 解説動画" section
- Inline video player (HTML5 `<video>`)
- List videos by title
- Click to play/pause
- Fullscreen option

## 9. Camera Answer Capture (SLV-020, SLV-021)

### Mobile Flow
1. Student taps 📷 button on essay answer area
2. Device camera opens (rear camera default)
3. Student photographs handwritten answer sheet
4. Crop/rotate UI appears:
   - Drag corners to crop to answer area
   - Rotate 90° buttons
   - Brightness/contrast sliders
5. Confirm → upload to Supabase Storage
6. Image displayed in answer area with "AI will process this image"
7. On submission: AI Vision extracts text → grades as essay

### Technical Implementation
```html
<!-- Mobile camera input -->
<input
  type="file"
  accept="image/jpeg,image/png"
  capture="environment"
  onChange={handleCapture}
/>
```

### Image Processing Pipeline
1. Capture/upload image (JPEG, max 10MB)
2. Client-side: crop, rotate, compress
3. Upload to `answer-images/{user_id}/{submission_id}/{question_id}.jpg`
4. On grading: send image to AI Vision
5. AI extracts text content
6. Grade extracted text against rubric
7. Store both image URL and extracted text in submission

## 10. Score History (SLV-023)

### Submission History per Problem Set
```
Score Trend:
100 ┤                          ●
 80 ┤              ●    ●
 60 ┤    ●
 40 ┤
 20 ┤  ●
  0 ┼────────────────────────────
    1st  2nd  3rd  4th  5th  attempt

Attempts:
| # | Date       | Score    | Time   | Actions      |
|---|-----------|----------|--------|--------------|
| 5 | 2026-03-23 | 92/100   | 48:30  | [View] [PDF] |
| 4 | 2026-03-20 | 85/100   | 52:15  | [View] [PDF] |
| 3 | 2026-03-15 | 78/100   | 55:00  | [View] [PDF] |
| 2 | 2026-03-10 | 62/100   | 60:00  | [View] [PDF] |
| 1 | 2026-03-05 | 45/100   | 58:45  | [View] [PDF] |
```

## 11. Grading Disclaimer (SLV-024)

Displayed on EVERY grading result page:
```
⚠ AI採点について
このスコアはAIによる参考採点です。最終的な判断はご自身の責任で行ってください。
実際の入試採点とは異なる場合があります。
```

Style: warning callout box, muted yellow background, not dismissable.
