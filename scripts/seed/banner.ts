import type { ProblemSetOutcome } from "./problem-sets";
import { TEST_SELLER } from "./seller";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const ESC = "\u001b";
const ST = `${ESC}\\`;

export interface BannerInput {
  sellerEmail: string;
  sellerUid: string;
  problemSets: ProblemSetOutcome[];
  questionsActuallyInserted: number;
  totalPdfBytes: number;
  elapsedMs: number;
  degraded: boolean;
  missingTables: string[];
}

// OSC 8 hyperlink: ESC ] 8 ; ; URL ST LABEL ESC ] 8 ; ; ST
export function osc8(url: string, label: string): string {
  return `${ESC}]8;;${url}${ST}${label}${ESC}]8;;${ST}`;
}

function isTty(): boolean {
  return Boolean(process.stdout.isTTY);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function link(url: string): string {
  return isTty() ? osc8(url, url) : url;
}

export function printBanner(input: BannerInput): void {
  const elapsedSec = (input.elapsedMs / 1000).toFixed(1);
  const setCount = input.problemSets.length;
  const firstSetUrl = input.problemSets[0]
    ? `${APP_URL}/problem/${input.problemSets[0].problemSetId}`
    : `${APP_URL}/explore`;
  const sellerUrl = `${APP_URL}/sellers/${input.sellerUid}`;
  const exploreUrl = `${APP_URL}/explore?subject=math`;
  const loginUrl = `${APP_URL}/login`;

  const questionsLine = input.degraded
    ? `Questions: 0 inserted (questions table missing — run \`supabase db push\`)`
    : `Questions: ${input.questionsActuallyInserted}`;

  const lines: string[] = [];
  lines.push("");
  lines.push("─".repeat(72));
  lines.push(
    ` Toinoma seed complete  (${elapsedSec}s • ${formatBytes(input.totalPdfBytes)} uploaded)`
  );
  lines.push("─".repeat(72));
  if (input.degraded) {
    lines.push(` Mode: DEGRADED — missing: ${input.missingTables.join(", ")}`);
    lines.push(" Run `supabase db push` to apply migrations and re-run for full data.");
    lines.push("");
  }
  lines.push(` Sets: ${setCount}   ${questionsLine}   PDFs: ${setCount * 3}`);
  lines.push("");
  lines.push(" Sign-in credentials (seed seller):");
  lines.push(`   Email:    ${input.sellerEmail}`);
  lines.push(`   Password: ${TEST_SELLER.password}`);
  lines.push(`   UID:      ${input.sellerUid}`);
  lines.push("");
  lines.push(" Next steps (open in browser):");
  lines.push(`   - Login:                 ${link(loginUrl)}`);
  lines.push(`   - Explore (math filter): ${link(exploreUrl)}`);
  lines.push(`   - Seller profile:        ${link(sellerUrl)}`);
  lines.push(`   - First problem detail:  ${link(firstSetUrl)}`);
  lines.push("─".repeat(72));
  lines.push("");
  for (const line of lines) console.log(line);
}
