import { NextResponse } from "next/server";
import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Maximum PDF size: 50 MB
const MAX_FILE_SIZE = 50 * 1024 * 1024;

// Type definitions for extracted questions
export interface ExtractedRubricElement {
  element: string;
  points: number;
}

export interface ExtractedQuestion {
  /** Unique temporary ID for tracking within the import session */
  tempId: string;
  questionType: "essay" | "mark_sheet" | "fill_in_blank" | "multiple_choice";
  questionText: string;
  /** AI's best guess at the subject */
  subject: string | null;
  /** AI's best guess at the difficulty */
  difficulty: string | null;
  points: number;
  modelAnswer: string | null;
  /** Type-specific rubric data */
  rubric: Record<string, unknown>;
  /** AI confidence: high, medium, low */
  confidence: "high" | "medium" | "low";
  /** Reasoning from the AI about its classification */
  extractionNotes: string;
}

const EXTRACTION_SYSTEM_PROMPT = `You are an expert exam question analyzer for Japanese university entrance exam preparation.
Your task is to analyze a PDF document and extract individual questions from it.

For each question you identify, determine:
1. The question type:
   - "essay": Free-form written response (記述式). Includes questions asking for explanations, proofs, derivations, essays, or any open-ended written answer.
   - "mark_sheet": Select from predefined choices using marks (マーク式). Typically uses ア, イ, ウ, エ, オ etc. or numbered options.
   - "fill_in_blank": Fill in a specific value or short answer (穴埋め式). Includes questions with blanks like (  ) or 「　」to fill.
   - "multiple_choice": Choose from labeled options a, b, c, d... (選択式). Similar to mark_sheet but with distinct option text.

2. The full question text, preserving mathematical notation using LaTeX where applicable.

3. The subject area. Use EXACTLY one of these values:
   - "math" (数学)
   - "english" (英語)
   - "japanese" (国語)
   - "physics" (物理)
   - "chemistry" (化学)
   - "biology" (生物)
   - "japanese_history" (日本史)
   - "world_history" (世界史)
   - "geography" (地理)
   If you cannot determine the subject, use null.

4. The difficulty. Use EXACTLY one of these values:
   - "easy" (基礎 - fundamental level)
   - "medium" (標準 - standard level)
   - "hard" (発展 - advanced level)
   If you cannot determine the difficulty, use null.

5. Point value (配点). If specified in the PDF, use that value. Otherwise estimate based on question complexity.

6. The model answer if available in the PDF.

7. A rubric appropriate for the question type:
   - For "essay": { "type": "essay", "rubric_elements": [{ "description": "...", "points": N }] }
   - For "mark_sheet": { "type": "mark_sheet", "choices": ["ア", "イ", ...], "correct_answers": ["ア"], "scoring_mode": "all_or_nothing" }
   - For "fill_in_blank": { "type": "fill_in_blank", "blanks": [{ "id": "blank-0", "label": "(1)", "acceptable_answers": ["answer1", "answer2"], "points": N }] }
   - For "multiple_choice": { "type": "multiple_choice", "options": [{ "id": "a", "text": "..." }], "correct_option_ids": ["a"], "select_mode": "single" }

8. Your confidence level in the extraction:
   - "high": Question text is clear, type is unambiguous, rubric/answer is present in the PDF.
   - "medium": Question text is mostly clear, type is inferred but reasonable, rubric/answer may be partially present.
   - "low": Question text is partially unclear, type is a guess, no rubric/answer data available.

9. Brief notes explaining your classification decisions.

IMPORTANT RULES:
- Extract EVERY distinct question. A single numbered problem with sub-parts (1), (2), (3) should be extracted as separate questions.
- If the PDF has both questions and answers/solutions, associate them properly.
- Preserve the original numbering in the question text.
- For math content, use LaTeX notation: inline $...$ and display $$...$$
- If the document is not an exam or contains no extractable questions, return an empty array.
- Output valid JSON only. No markdown code fences. No extra text.

Respond with a JSON object in EXACTLY this format:
{
  "questions": [
    {
      "questionType": "essay" | "mark_sheet" | "fill_in_blank" | "multiple_choice",
      "questionText": "Full question text with LaTeX where applicable",
      "subject": "math" | "english" | ... | null,
      "difficulty": "easy" | "medium" | "hard" | null,
      "points": 10,
      "modelAnswer": "The model answer if found, or null",
      "rubric": { ... type-specific rubric object ... },
      "confidence": "high" | "medium" | "low",
      "extractionNotes": "Brief notes on classification decisions"
    }
  ]
}`;

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify seller status
  const { data: sellerProfile } = await supabase
    .from("seller_profiles")
    .select("id, tos_accepted_at")
    .eq("id", user.id)
    .single();

  if (!sellerProfile?.tos_accepted_at) {
    return NextResponse.json(
      { error: "Seller onboarding not complete" },
      { status: 403 }
    );
  }

  // Parse multipart form data
  const formData = await request.formData();
  const file = formData.get("pdf") as File | null;

  if (!file) {
    return NextResponse.json(
      { error: "No PDF file provided" },
      { status: 400 }
    );
  }

  if (file.type !== "application/pdf") {
    return NextResponse.json(
      { error: "Only PDF files are accepted" },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "File size exceeds 50MB limit" },
      { status: 400 }
    );
  }

  // Upload PDF to temporary storage
  const timestamp = Date.now();
  const storagePath = `${user.id}/imports/${timestamp}.pdf`;

  const adminSupabase = createAdminClient();

  const fileBuffer = await file.arrayBuffer();

  const { error: uploadError } = await adminSupabase.storage
    .from("problem-pdfs")
    .upload(storagePath, fileBuffer, {
      contentType: "application/pdf",
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json(
      { error: `Upload failed: ${uploadError.message}` },
      { status: 500 }
    );
  }

  // Get a signed URL for the AI to read the PDF
  const { data: signedUrlData, error: signedUrlError } =
    await adminSupabase.storage
      .from("problem-pdfs")
      .createSignedUrl(storagePath, 600); // 10 minutes

  if (signedUrlError || !signedUrlData?.signedUrl) {
    // Clean up uploaded file on failure
    await adminSupabase.storage.from("problem-pdfs").remove([storagePath]);
    return NextResponse.json(
      { error: "Failed to generate signed URL" },
      { status: 500 }
    );
  }

  try {
    // Fetch the PDF as a buffer for the AI model
    const pdfResponse = await fetch(signedUrlData.signedUrl);
    const pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer());
    const pdfBase64 = pdfBuffer.toString("base64");

    // Call Google Generative AI with the PDF content
    const { text } = await generateText({
      model: google("gemini-2.0-flash"),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "file",
              data: pdfBase64,
              mediaType: "application/pdf",
            },
            {
              type: "text",
              text: "Analyze this PDF and extract all exam questions. Follow the system instructions exactly.",
            },
          ],
        },
      ],
      system: EXTRACTION_SYSTEM_PROMPT,
      maxOutputTokens: 8192,
      temperature: 0.1, // Low temperature for structured extraction
    });

    // Parse the AI response
    const cleanedText = text
      .replace(/^```json\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    let parsed: { questions: Array<Omit<ExtractedQuestion, "tempId">> };
    try {
      parsed = JSON.parse(cleanedText);
    } catch {
      // Clean up uploaded file on failure
      await adminSupabase.storage.from("problem-pdfs").remove([storagePath]);
      return NextResponse.json(
        {
          error: "Failed to parse AI response",
          rawResponse: cleanedText.slice(0, 500),
        },
        { status: 500 }
      );
    }

    if (!parsed.questions || !Array.isArray(parsed.questions)) {
      await adminSupabase.storage.from("problem-pdfs").remove([storagePath]);
      return NextResponse.json(
        { error: "AI response did not contain a questions array" },
        { status: 500 }
      );
    }

    // Assign temporary IDs and validate each question
    const questions: ExtractedQuestion[] = parsed.questions.map((q, i) => ({
      tempId: `import-${timestamp}-${i}`,
      questionType: validateQuestionType(q.questionType),
      questionText: String(q.questionText ?? ""),
      subject: validateSubject(q.subject),
      difficulty: validateDifficulty(q.difficulty),
      points: typeof q.points === "number" && q.points > 0 ? q.points : 10,
      modelAnswer: q.modelAnswer ? String(q.modelAnswer) : null,
      rubric: typeof q.rubric === "object" && q.rubric !== null ? q.rubric : {},
      confidence: validateConfidence(q.confidence),
      extractionNotes: String(q.extractionNotes ?? ""),
    }));

    // Clean up temporary PDF after successful extraction
    await adminSupabase.storage.from("problem-pdfs").remove([storagePath]);

    return NextResponse.json({
      questions,
      totalExtracted: questions.length,
    });
  } catch (error) {
    // Clean up uploaded file on any error
    await adminSupabase.storage.from("problem-pdfs").remove([storagePath]);

    const message =
      error instanceof Error ? error.message : "Unknown extraction error";
    return NextResponse.json(
      { error: `AI extraction failed: ${message}` },
      { status: 500 }
    );
  }
}

// Validation helpers

const VALID_QUESTION_TYPES = [
  "essay",
  "mark_sheet",
  "fill_in_blank",
  "multiple_choice",
] as const;

function validateQuestionType(
  type: unknown
): ExtractedQuestion["questionType"] {
  if (
    typeof type === "string" &&
    VALID_QUESTION_TYPES.includes(type as ExtractedQuestion["questionType"])
  ) {
    return type as ExtractedQuestion["questionType"];
  }
  return "essay"; // Default to essay if unrecognizable
}

const VALID_SUBJECTS = [
  "math",
  "english",
  "japanese",
  "physics",
  "chemistry",
  "biology",
  "japanese_history",
  "world_history",
  "geography",
] as const;

function validateSubject(subject: unknown): string | null {
  if (
    typeof subject === "string" &&
    VALID_SUBJECTS.includes(subject as (typeof VALID_SUBJECTS)[number])
  ) {
    return subject;
  }
  return null;
}

const VALID_DIFFICULTIES = ["easy", "medium", "hard"] as const;

function validateDifficulty(difficulty: unknown): string | null {
  if (
    typeof difficulty === "string" &&
    VALID_DIFFICULTIES.includes(
      difficulty as (typeof VALID_DIFFICULTIES)[number]
    )
  ) {
    return difficulty;
  }
  return null;
}

function validateConfidence(
  confidence: unknown
): ExtractedQuestion["confidence"] {
  if (
    typeof confidence === "string" &&
    ["high", "medium", "low"].includes(confidence)
  ) {
    return confidence as ExtractedQuestion["confidence"];
  }
  return "medium";
}
