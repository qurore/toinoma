/**
 * Print-specific CSS styles injected via <style> tag.
 * Handles @page size, margins, font declarations, page breaks,
 * vertical text, answer area styling, and high-contrast printing.
 */

type MarginPreset = "narrow" | "normal" | "wide";

const MARGIN_VALUES: Record<MarginPreset, string> = {
  narrow: "15mm",
  normal: "25mm",
  wide: "30mm",
};

export function PrintStyles({ margin }: { margin: MarginPreset }) {
  const marginValue = MARGIN_VALUES[margin];

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
/* ===== Font Declarations ===== */
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;600;700&family=Noto+Serif+JP:wght@400;500;600;700&display=swap');

/* ===== Page Setup ===== */
@page {
  size: A4 portrait;
  margin: ${marginValue};
}

/* ===== Screen Preview ===== */
@media screen {
  .print-page {
    width: 210mm;
    min-height: 297mm;
    margin: 0 auto 24px;
    padding: ${marginValue};
    background: white;
    box-shadow: 0 2px 16px rgba(0, 0, 0, 0.1);
    border-radius: 4px;
    box-sizing: border-box;
  }

  body {
    background: #e5e7eb;
    margin: 0;
    padding: 24px 16px;
  }
}

/* ===== Print Overrides ===== */
@media print {
  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    color-adjust: exact !important;
  }

  html, body {
    margin: 0;
    padding: 0;
    background: white;
  }

  .print-page {
    width: auto;
    min-height: auto;
    margin: 0;
    padding: 0;
    box-shadow: none;
    border-radius: 0;
    page-break-inside: avoid;
  }

  .no-print {
    display: none !important;
  }

  .print-section-break {
    page-break-before: always;
  }

  .print-avoid-break {
    page-break-inside: avoid;
  }

  .print-footer {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    text-align: center;
  }
}

/* ===== Typography ===== */
.print-body {
  font-family: 'Noto Serif JP', 'Hiragino Mincho ProN', serif;
  font-size: 10.5pt;
  line-height: 1.8;
  color: #000;
}

.print-heading {
  font-family: 'Noto Sans JP', 'Hiragino Kaku Gothic ProN', sans-serif;
  font-weight: 600;
  color: #000;
}

/* ===== Page Header ===== */
.print-page-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding-bottom: 8pt;
  margin-bottom: 16pt;
  border-bottom: 2pt solid #000;
}

.print-page-header-title {
  font-family: 'Noto Sans JP', sans-serif;
  font-size: 14pt;
  font-weight: 700;
  color: #000;
}

.print-page-header-section {
  font-family: 'Noto Sans JP', sans-serif;
  font-size: 10pt;
  font-weight: 500;
  color: #333;
}

.print-page-header-date {
  font-family: 'Noto Sans JP', sans-serif;
  font-size: 8pt;
  color: #666;
}

/* ===== Section Styling ===== */
.print-section-title {
  font-family: 'Noto Sans JP', sans-serif;
  font-size: 13pt;
  font-weight: 700;
  color: #000;
  margin-bottom: 12pt;
  padding: 6pt 10pt;
  background: #f3f4f6;
  border-left: 4pt solid #000;
}

/* ===== Question Styling ===== */
.print-question {
  margin-bottom: 20pt;
  page-break-inside: avoid;
}

.print-question-number {
  font-family: 'Noto Sans JP', sans-serif;
  font-size: 11pt;
  font-weight: 600;
  color: #000;
  margin-bottom: 6pt;
}

.print-question-points {
  font-family: 'Noto Sans JP', sans-serif;
  font-size: 9pt;
  font-weight: 400;
  color: #555;
  margin-left: 8pt;
}

.print-question-text {
  font-family: 'Noto Serif JP', serif;
  font-size: 10.5pt;
  line-height: 1.8;
  color: #000;
  margin-bottom: 10pt;
  white-space: pre-wrap;
}

/* ===== Answer Areas ===== */

/* Lined writing area for essay questions */
.print-essay-lines {
  border: 1pt solid #000;
  padding: 0;
  min-height: 120pt;
}

.print-essay-line {
  border-bottom: 0.5pt solid #ccc;
  height: 24pt;
  width: 100%;
}

.print-essay-line:last-child {
  border-bottom: none;
}

/* Model answer display */
.print-model-answer {
  border: 1pt solid #666;
  padding: 8pt 10pt;
  background: #fafafa;
  font-family: 'Noto Serif JP', serif;
  font-size: 10pt;
  line-height: 1.8;
  white-space: pre-wrap;
}

.print-model-answer-label {
  font-family: 'Noto Sans JP', sans-serif;
  font-size: 9pt;
  font-weight: 600;
  color: #333;
  margin-bottom: 4pt;
}

/* Mark sheet bubble grid */
.print-bubble-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8pt;
  margin-top: 6pt;
}

.print-bubble {
  display: flex;
  align-items: center;
  gap: 4pt;
  font-family: 'Noto Sans JP', sans-serif;
  font-size: 10pt;
}

.print-bubble-circle {
  width: 14pt;
  height: 14pt;
  border-radius: 50%;
  border: 1.5pt solid #000;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.print-bubble-filled {
  background: #000;
}

/* Fill-in-blank */
.print-blank-box {
  display: inline-block;
  border-bottom: 1.5pt solid #000;
  min-width: 80pt;
  height: 20pt;
  margin: 0 4pt;
  vertical-align: bottom;
}

.print-blank-answer {
  display: inline-block;
  border: 1pt solid #666;
  padding: 2pt 8pt;
  min-width: 80pt;
  font-family: 'Noto Serif JP', serif;
  font-size: 10.5pt;
  background: #fafafa;
  margin: 0 4pt;
  vertical-align: bottom;
}

/* Multiple choice options */
.print-option-list {
  list-style: none;
  padding: 0;
  margin: 6pt 0 0 0;
}

.print-option-item {
  display: flex;
  align-items: flex-start;
  gap: 6pt;
  margin-bottom: 6pt;
  font-family: 'Noto Serif JP', serif;
  font-size: 10.5pt;
  line-height: 1.6;
}

.print-option-marker {
  width: 14pt;
  height: 14pt;
  border: 1.5pt solid #000;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 2pt;
  display: flex;
  align-items: center;
  justify-content: center;
}

.print-option-marker-checked {
  background: #000;
}

.print-option-marker-checked::after {
  content: '';
  width: 6pt;
  height: 6pt;
  border-radius: 50%;
  background: white;
}

/* ===== Vertical Text ===== */
.print-vertical {
  writing-mode: vertical-rl;
  text-orientation: mixed;
  line-height: 2.2;
  letter-spacing: 0.05em;
  font-family: 'Noto Serif JP', 'Hiragino Mincho ProN', serif;
}

.print-vertical .tcy {
  text-combine-upright: all;
}

.print-vertical .print-essay-lines {
  min-height: auto;
  min-width: 120pt;
  height: 200pt;
}

.print-vertical .print-essay-line {
  border-bottom: none;
  border-left: 0.5pt solid #ccc;
  height: 100%;
  width: 24pt;
  display: inline-block;
}

.print-vertical .print-essay-line:last-child {
  border-left: none;
}

/* ===== Footer ===== */
.print-page-footer {
  margin-top: auto;
  padding-top: 8pt;
  border-top: 0.5pt solid #ccc;
  text-align: center;
  font-family: 'Noto Sans JP', sans-serif;
  font-size: 8pt;
  color: #666;
}

/* ===== Mode Badge ===== */
.print-mode-badge {
  display: inline-block;
  font-family: 'Noto Sans JP', sans-serif;
  font-size: 8pt;
  font-weight: 600;
  padding: 2pt 8pt;
  border: 1pt solid #000;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
`,
      }}
    />
  );
}
