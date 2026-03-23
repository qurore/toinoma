import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// PDF export types
type ExportType = "problems" | "answers" | "combined";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const problemSetId = searchParams.get("problem_set_id");
  const exportType = (searchParams.get("type") ?? "problems") as ExportType;

  if (!problemSetId) {
    return NextResponse.json(
      { error: "problem_set_id is required" },
      { status: 400 }
    );
  }

  // Verify purchase
  const { data: purchase } = await supabase
    .from("purchases")
    .select("id")
    .eq("user_id", user.id)
    .eq("problem_set_id", problemSetId)
    .single();

  if (!purchase) {
    return NextResponse.json(
      { error: "購入後にダウンロードできます" },
      { status: 403 }
    );
  }

  // Fetch problem set
  const { data: ps } = await supabase
    .from("problem_sets")
    .select("title, subject, problem_pdf_url, solution_pdf_url, rubric")
    .eq("id", problemSetId)
    .single();

  if (!ps) {
    return NextResponse.json(
      { error: "問題セットが見つかりません" },
      { status: 404 }
    );
  }

  // For now, redirect to the stored PDF if available
  // Full HTML-to-PDF generation can be added later with puppeteer
  if (exportType === "problems" && ps.problem_pdf_url) {
    return NextResponse.redirect(ps.problem_pdf_url);
  }

  if (exportType === "answers" && ps.solution_pdf_url) {
    return NextResponse.redirect(ps.solution_pdf_url);
  }

  // Generate a simple HTML-based PDF as fallback
  const html = generatePdfHtml(ps, exportType);

  // Return as HTML that can be printed via browser print dialog
  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `inline; filename="${encodeURIComponent(ps.title)}.html"`,
    },
  });
}

function generatePdfHtml(
  ps: {
    title: string;
    subject: string;
    rubric: unknown;
  },
  exportType: ExportType
): string {
  const rubric = ps.rubric as {
    sections?: Array<{
      number: number;
      points: number;
      questions: Array<{
        number: string;
        type: string;
        points: number;
        rubric?: Array<{ element: string; points: number }>;
        modelAnswer?: string;
      }>;
    }>;
  };

  const sections = rubric?.sections ?? [];

  let content = "";

  if (exportType === "problems" || exportType === "combined") {
    content += `<h2>問題</h2>`;
    for (const section of sections) {
      content += `<h3>大問${section.number}（${section.points}点）</h3>`;
      for (const q of section.questions ?? []) {
        content += `<div class="question">
          <p><strong>${q.number}</strong>（${q.points}点）</p>
        </div>`;
      }
    }
  }

  if (exportType === "answers" || exportType === "combined") {
    content += `<h2 style="page-break-before: always;">解答用紙</h2>`;
    for (const section of sections) {
      content += `<h3>大問${section.number}</h3>`;
      for (const q of section.questions ?? []) {
        if (q.type === "essay") {
          content += `<div class="answer-box" style="min-height: 150px; border: 1px solid #ccc; margin: 10px 0; padding: 10px;">
            <p class="label">${q.number}</p>
          </div>`;
        } else {
          content += `<div class="answer-line" style="margin: 10px 0;">
            <p>${q.number}: _______________</p>
          </div>`;
        }
      }
    }
  }

  if (exportType === "combined") {
    content += `<h2 style="page-break-before: always;">模範解答</h2>`;
    for (const section of sections) {
      content += `<h3>大問${section.number}</h3>`;
      for (const q of section.questions ?? []) {
        if (q.modelAnswer) {
          content += `<div class="model-answer" style="margin: 10px 0;">
            <p><strong>${q.number}:</strong> ${q.modelAnswer}</p>
          </div>`;
        }
      }
    }
  }

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <title>${ps.title}</title>
  <style>
    @page { size: A4; margin: 25mm; }
    body { font-family: 'Noto Serif JP', 'Hiragino Mincho ProN', serif; font-size: 11pt; line-height: 1.8; color: #333; }
    h1 { font-size: 18pt; text-align: center; margin-bottom: 20pt; }
    h2 { font-size: 14pt; border-bottom: 1px solid #999; padding-bottom: 4pt; margin-top: 20pt; }
    h3 { font-size: 12pt; margin-top: 16pt; }
    .question { margin: 12pt 0; }
    .footer { position: fixed; bottom: 10mm; right: 10mm; font-size: 8pt; color: #999; }
    @media print { .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="no-print" style="background: #f0f0f0; padding: 10px; margin-bottom: 20px; text-align: center;">
    <button onclick="window.print()" style="padding: 8px 24px; font-size: 14px; cursor: pointer;">印刷 / PDFとして保存</button>
  </div>
  <h1>${ps.title}</h1>
  ${content}
  <div class="footer">問の間 — toinoma.jp</div>
</body>
</html>`;
}
