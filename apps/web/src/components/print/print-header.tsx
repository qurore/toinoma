/**
 * Header component rendered at the top of each print section.
 * Shows the problem set title, section name, and export mode.
 */

type PrintMode = "problems" | "answers" | "combined";

const MODE_LABELS: Record<PrintMode, string> = {
  problems: "問題",
  answers: "模範解答",
  combined: "問題 + 模範解答",
};

export function PrintHeader({
  title,
  sectionTitle,
  mode,
  date,
}: {
  title: string;
  sectionTitle?: string | null;
  mode: PrintMode;
  date: string;
}) {
  return (
    <div className="print-page-header">
      <div>
        <div className="print-page-header-title">{title}</div>
        {sectionTitle && (
          <div className="print-page-header-section">{sectionTitle}</div>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "8pt" }}>
        <span className="print-mode-badge">{MODE_LABELS[mode]}</span>
        <span className="print-page-header-date">{date}</span>
      </div>
    </div>
  );
}
