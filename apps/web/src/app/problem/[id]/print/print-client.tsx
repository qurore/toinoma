"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Printer, ArrowLeft, Settings2 } from "lucide-react";

type PrintMode = "problems" | "answers" | "combined";
type MarginPreset = "narrow" | "normal" | "wide";

const MODE_OPTIONS: Array<{ value: PrintMode; label: string }> = [
  { value: "problems", label: "問題のみ" },
  { value: "answers", label: "模範解答のみ" },
  { value: "combined", label: "問題 + 模範解答" },
];

const MARGIN_OPTIONS: Array<{ value: MarginPreset; label: string; description: string }> = [
  { value: "narrow", label: "狭い", description: "15mm" },
  { value: "normal", label: "標準", description: "25mm" },
  { value: "wide", label: "広い", description: "30mm" },
];

export function PrintClient({
  problemSetId,
}: {
  problemSetId: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showControls, setShowControls] = useState(true);

  const currentMode = (searchParams.get("mode") as PrintMode) || "problems";
  const currentMargin = (searchParams.get("margin") as MarginPreset) || "normal";

  // Auto-trigger print after a brief delay to let fonts load
  useEffect(() => {
    const timer = setTimeout(() => {
      // Only auto-print if controls are hidden (user clicked print)
      if (!showControls) {
        window.print();
        setShowControls(true);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [showControls]);

  const handleSettingChange = useCallback(
    (key: "mode" | "margin", value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set(key, value);
      router.replace(`/problem/${problemSetId}/print?${params.toString()}`);
    },
    [router, problemSetId, searchParams]
  );

  const handlePrint = useCallback(() => {
    setShowControls(false);
  }, []);

  const handleBack = useCallback(() => {
    router.push(`/problem/${problemSetId}`);
  }, [router, problemSetId]);

  return (
    <div className="no-print" style={controlBarStyle}>
      {showControls && (
        <div style={controlContainerStyle}>
          <div style={controlInnerStyle}>
            {/* Back button */}
            <button
              onClick={handleBack}
              style={backButtonStyle}
              aria-label="戻る"
            >
              <ArrowLeft style={{ width: 16, height: 16 }} />
              <span>戻る</span>
            </button>

            <div style={dividerStyle} />

            {/* Settings icon */}
            <Settings2 style={{ width: 16, height: 16, color: "#6b7280", flexShrink: 0 }} aria-hidden="true" />

            {/* Mode selector */}
            <div style={fieldStyle}>
              <label style={labelStyle}>出力内容</label>
              <select
                value={currentMode}
                onChange={(e) => handleSettingChange("mode", e.target.value)}
                style={selectStyle}
              >
                {MODE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Margin selector */}
            <div style={fieldStyle}>
              <label style={labelStyle}>余白</label>
              <select
                value={currentMargin}
                onChange={(e) => handleSettingChange("margin", e.target.value)}
                style={selectStyle}
              >
                {MARGIN_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label} ({opt.description})
                  </option>
                ))}
              </select>
            </div>

            <div style={dividerStyle} />

            {/* Print button */}
            <button
              onClick={handlePrint}
              style={printButtonStyle}
            >
              <Printer style={{ width: 16, height: 16 }} />
              <span>印刷 / PDF保存</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Inline styles (these are for the control bar only, which is hidden during print) ---

const controlBarStyle: React.CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  zIndex: 1000,
  pointerEvents: "none",
};

const controlContainerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "center",
  padding: "12px 16px",
  pointerEvents: "auto",
};

const controlInnerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "8px 16px",
  background: "white",
  borderRadius: 12,
  boxShadow: "0 4px 24px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)",
  fontFamily: "'Noto Sans JP', system-ui, sans-serif",
  fontSize: 13,
};

const backButtonStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 4,
  padding: "6px 10px",
  border: "1px solid #e5e7eb",
  borderRadius: 6,
  background: "white",
  cursor: "pointer",
  fontSize: 13,
  color: "#374151",
  fontFamily: "inherit",
};

const dividerStyle: React.CSSProperties = {
  width: 1,
  height: 24,
  background: "#e5e7eb",
  flexShrink: 0,
};

const fieldStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  color: "#6b7280",
  whiteSpace: "nowrap",
};

const selectStyle: React.CSSProperties = {
  padding: "4px 8px",
  border: "1px solid #e5e7eb",
  borderRadius: 6,
  background: "white",
  fontSize: 13,
  color: "#111827",
  cursor: "pointer",
  fontFamily: "inherit",
};

const printButtonStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "6px 14px",
  border: "none",
  borderRadius: 6,
  background: "#111827",
  color: "white",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 500,
  fontFamily: "inherit",
};
