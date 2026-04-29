/**
 * PDF / DOCX → StructuredContent parser.
 *
 * Pipeline:
 *   1. Accept input as Buffer or storage path.
 *   2. For PDFs: send the binary directly to Gemini (it handles native PDF input).
 *   3. For DOCX: convert via mammoth into HTML, then re-emit as a synthesized PDF
 *      *or* send the HTML text plus original DOCX images.
 *   4. Call Gemini 2.5 Pro with vision + structured output, constrained by Zod.
 *   5. Validate, post-process (assign ids, lint refs, derive defaults), persist.
 */
import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import {
  structuredContentSchema,
  type StructuredContent,
} from "@toinoma/shared/schemas";
import type { Subject } from "@toinoma/shared/types";
import { buildParserSystemPrompt } from "./parser-prompts";
import {
  validateAst,
  tryValidateAst,
  assignIds,
  lintReferences,
} from "./ast-utils";

const PARSER_TIMEOUT_MS = 120_000;
const PARSER_MAX_RETRIES = 2;
const RETRY_DELAY_MS = 2_000;

const PARSER_MODEL_ID = "gemini-2.5-pro";

export type ParserSource =
  | { kind: "pdf"; data: Uint8Array; filename?: string }
  | { kind: "docx"; data: Uint8Array; filename?: string }
  | { kind: "image"; data: Uint8Array; mime: string };

export interface ParserOptions {
  subject?: Subject;
  university?: string;
  year?: number;
  /** Extra instructions appended to the system prompt (creator hints). */
  hint?: string;
  /** Abort in-flight call. */
  signal?: AbortSignal;
}

export interface ParserResult {
  ast: StructuredContent;
  warnings: string[];
  rawDurationMs: number;
}

export class ParserError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "INPUT_INVALID"
      | "AI_CALL_FAILED"
      | "AI_OUTPUT_INVALID"
      | "TIMEOUT"
      | "CANCELLED",
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "ParserError";
  }
}

export async function parseToStructuredContent(
  source: ParserSource,
  opts: ParserOptions = {},
): Promise<ParserResult> {
  const startedAt = Date.now();
  if (!source || !("data" in source) || source.data.length === 0) {
    throw new ParserError("Empty input", "INPUT_INVALID");
  }

  const system = buildParserSystemPrompt(opts.subject) + (opts.hint ? `\n\nCREATOR HINT:\n${opts.hint}` : "");
  const filePart = sourceToFilePart(source);

  let lastError: unknown;

  for (let attempt = 0; attempt <= PARSER_MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt));
    }
    if (opts.signal?.aborted) {
      throw new ParserError("Parser cancelled", "CANCELLED");
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PARSER_TIMEOUT_MS);
    if (opts.signal) {
      opts.signal.addEventListener("abort", () => controller.abort(), { once: true });
    }

    try {
      const result = await generateObject({
        model: google(PARSER_MODEL_ID),
        schema: structuredContentSchema,
        system,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: buildUserPrompt(opts),
              },
              filePart,
            ],
          },
        ],
        abortSignal: controller.signal,
      });
      clearTimeout(timer);

      const validation = tryValidateAst(result.object);
      if (!validation.ok) {
        // One retry with stricter prompt
        if (attempt < PARSER_MAX_RETRIES) {
          lastError = validation.error;
          continue;
        }
        throw new ParserError(
          "Parser produced invalid AST: " + validation.error.issues
            .slice(0, 3)
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join("; "),
          "AI_OUTPUT_INVALID",
          validation.error,
        );
      }

      const ast = postProcess(validation.ast, opts);
      const warnings = lintReferences(ast);

      return {
        ast,
        warnings,
        rawDurationMs: Date.now() - startedAt,
      };
    } catch (error) {
      clearTimeout(timer);
      if (controller.signal.aborted) {
        if (opts.signal?.aborted) {
          throw new ParserError("Parser cancelled", "CANCELLED", error);
        }
        if (attempt >= PARSER_MAX_RETRIES) {
          throw new ParserError(
            `Parser timed out after ${PARSER_TIMEOUT_MS}ms`,
            "TIMEOUT",
            error,
          );
        }
        lastError = error;
        continue;
      }
      if (error instanceof ParserError) throw error;
      lastError = error;
      if (attempt >= PARSER_MAX_RETRIES) {
        throw new ParserError(
          "AI parser call failed: " + (error instanceof Error ? error.message : String(error)),
          "AI_CALL_FAILED",
          error,
        );
      }
    }
  }

  throw new ParserError(
    "AI parser call failed after retries",
    "AI_CALL_FAILED",
    lastError,
  );
}

function sourceToFilePart(source: ParserSource):
  | { type: "file"; data: Uint8Array; mediaType: string; filename?: string }
  | { type: "image"; image: Uint8Array; mediaType: string } {
  switch (source.kind) {
    case "pdf":
      return {
        type: "file",
        data: source.data,
        mediaType: "application/pdf",
        filename: source.filename,
      };
    case "docx":
      // Vercel AI SDK + Gemini accept DOCX as file; if not, caller should pre-convert to PDF.
      return {
        type: "file",
        data: source.data,
        mediaType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        filename: source.filename,
      };
    case "image":
      return {
        type: "image",
        image: source.data,
        mediaType: source.mime,
      };
  }
}

function buildUserPrompt(opts: ParserOptions): string {
  const parts: string[] = [];
  parts.push(
    "Parse the attached exam document into a StructuredContent AST.",
  );
  if (opts.subject) parts.push(`Subject hint: ${opts.subject}.`);
  if (opts.university) parts.push(`University hint: ${opts.university}.`);
  if (opts.year) parts.push(`Year hint: ${opts.year}.`);
  parts.push(
    "Be exhaustive: every passage, footnote, citation, figure caption, and question must be captured.",
  );
  parts.push(
    "Preserve original Japanese characters. Do not translate. Do not omit anything.",
  );
  return parts.join("\n");
}

function postProcess(
  ast: StructuredContent,
  opts: ParserOptions,
): StructuredContent {
  const withDefaults: StructuredContent = {
    ...ast,
    subject: ast.subject ?? opts.subject,
    university: ast.university ?? opts.university,
    year: ast.year ?? opts.year,
  };
  return assignIds(withDefaults);
}

export { validateAst };
