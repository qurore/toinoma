/**
 * AST utilities: validation, normalization, ref resolution, id assignment.
 */
import {
  structuredContentSchema,
  type StructuredContent,
  type BlockNode,
  type InlineNode,
  type Question,
} from "@toinoma/shared/schemas";

export class AstValidationError extends Error {
  constructor(
    message: string,
    public readonly issues: { path: (string | number)[]; message: string }[],
  ) {
    super(message);
    this.name = "AstValidationError";
  }
}

export function validateAst(input: unknown): StructuredContent {
  const result = structuredContentSchema.safeParse(input);
  if (!result.success) {
    throw new AstValidationError(
      "Structured content failed schema validation",
      result.error.issues.map((i) => ({
        path: i.path.map((p) =>
          typeof p === "symbol" ? String(p) : p,
        ) as (string | number)[],
        message: i.message,
      })),
    );
  }
  return result.data;
}

export function tryValidateAst(
  input: unknown,
): { ok: true; ast: StructuredContent } | { ok: false; error: AstValidationError } {
  try {
    const ast = validateAst(input);
    return { ok: true, ast };
  } catch (error) {
    if (error instanceof AstValidationError) {
      return { ok: false, error };
    }
    throw error;
  }
}

/**
 * Walk every block node in pre-order. Useful for refs/index building.
 */
export function* walkBlocks(
  nodes: BlockNode[],
): Generator<{ node: BlockNode; path: (string | number)[] }> {
  for (let i = 0; i < nodes.length; i++) {
    yield* walkBlocksRec(nodes[i]!, [i]);
  }
}

function* walkBlocksRec(
  node: BlockNode,
  path: (string | number)[],
): Generator<{ node: BlockNode; path: (string | number)[] }> {
  yield { node, path };
  switch (node.kind) {
    case "section":
    case "subsection":
    case "passage":
      for (let i = 0; i < node.children.length; i++) {
        yield* walkBlocksRec(node.children[i]!, [...path, "children", i]);
      }
      break;
    case "question_group":
      for (let i = 0; i < node.children.length; i++) {
        const q = node.children[i]!;
        for (let j = 0; j < q.prompt.length; j++) {
          yield* walkBlocksRec(q.prompt[j]!, [
            ...path,
            "children",
            i,
            "prompt",
            j,
          ]);
        }
      }
      break;
    default:
      break;
  }
}

/**
 * Walk every inline node within a block subtree. Used for reading ruby/markers/blanks.
 */
export function collectInlineFromBlock(node: BlockNode): InlineNode[] {
  const out: InlineNode[] = [];
  visitBlock(node, (b) => collectInlineShallow(b, out));
  return out;
}

function visitBlock(node: BlockNode, fn: (n: BlockNode) => void): void {
  fn(node);
  switch (node.kind) {
    case "section":
    case "subsection":
    case "passage":
      for (const c of node.children) visitBlock(c, fn);
      break;
    case "question_group":
      for (const q of node.children)
        for (const p of q.prompt) visitBlock(p, fn);
      break;
    default:
      break;
  }
}

function collectInlineShallow(node: BlockNode, out: InlineNode[]): void {
  switch (node.kind) {
    case "paragraph":
    case "instruction":
    case "citation":
      out.push(...node.children);
      break;
    case "footnote_section":
      for (const it of node.items) out.push(...it.children);
      break;
    case "choices":
      for (const o of node.options) out.push(...o.children);
      break;
    case "table":
      if (node.caption) out.push(...node.caption);
      for (const row of node.rows)
        for (const cell of row) out.push(...cell.children);
      break;
    case "figure":
      if (node.caption) out.push(...node.caption);
      break;
    case "audio":
      if (node.transcript) out.push(...node.transcript);
      break;
    default:
      break;
  }
}

/**
 * Collect all blank ids defined inside a block subtree (top-level questions get blanks
 * via their `blanks` field; passages may also embed inline `blank` nodes for cloze).
 */
export function collectBlankIds(blocks: BlockNode[]): string[] {
  const ids = new Set<string>();
  for (const block of blocks) {
    visitBlock(block, (b) => {
      const inline = [] as InlineNode[];
      collectInlineShallow(b, inline);
      for (const n of inline) collectBlanksInline(n, ids);
      if (b.kind === "question_group") {
        for (const q of b.children) {
          if (q.blanks) for (const bl of q.blanks) ids.add(bl.id);
        }
      }
    });
  }
  return [...ids];
}

function collectBlanksInline(n: InlineNode, ids: Set<string>): void {
  switch (n.kind) {
    case "blank":
      ids.add(n.id);
      break;
    case "em":
    case "strong":
    case "kakko":
    case "underline":
      for (const c of n.children) collectBlanksInline(c, ids);
      break;
    default:
      break;
  }
}

/**
 * Assign stable ids to every Question and blank if missing.
 */
export function assignIds(content: StructuredContent): StructuredContent {
  let qCounter = 0;
  let bCounter = 0;
  const assignBlock = (b: BlockNode): BlockNode => {
    switch (b.kind) {
      case "section":
      case "subsection":
      case "passage":
        return { ...b, children: b.children.map(assignBlock) };
      case "question_group":
        return {
          ...b,
          children: b.children.map((q): Question => {
            const id = q.id || `q-${++qCounter}`;
            const blanks = q.blanks?.map((bl) => ({
              ...bl,
              id: bl.id || `b-${++bCounter}`,
            }));
            return {
              ...q,
              id,
              blanks,
              prompt: q.prompt.map(assignBlock),
            };
          }),
        };
      default:
        return b;
    }
  };
  return { ...content, body: content.body.map(assignBlock) };
}

/**
 * Verify every figure_ref / footnote_ref / question marker reference resolves
 * to a target inside the document. Returns warnings, not errors.
 */
export function lintReferences(content: StructuredContent): string[] {
  const warnings: string[] = [];
  const figureLabels = new Set<string>();
  const tableLabels = new Set<string>();
  const footnoteRefs = new Set<string>();
  const markerLabels = new Set<string>();

  for (const { node } of walkBlocks(content.body)) {
    if (node.kind === "figure") figureLabels.add(node.label);
    if (node.kind === "table") tableLabels.add(node.label);
    if (node.kind === "footnote_section") {
      for (const it of node.items) footnoteRefs.add(it.ref);
    }
    const inline: InlineNode[] = [];
    collectInlineShallow(node, inline);
    for (const i of inline) collectMarkers(i, markerLabels);
  }

  for (const { node } of walkBlocks(content.body)) {
    const inline: InlineNode[] = [];
    collectInlineShallow(node, inline);
    for (const i of inline) checkRefs(i, { figureLabels, tableLabels, footnoteRefs, markerLabels }, warnings);
  }

  return warnings;
}

function collectMarkers(n: InlineNode, set: Set<string>): void {
  switch (n.kind) {
    case "underline":
      if (n.marker) set.add(n.marker);
      for (const c of n.children) collectMarkers(c, set);
      break;
    case "em":
    case "strong":
    case "kakko":
      for (const c of n.children) collectMarkers(c, set);
      break;
    default:
      break;
  }
}

function checkRefs(
  n: InlineNode,
  ctx: {
    figureLabels: Set<string>;
    tableLabels: Set<string>;
    footnoteRefs: Set<string>;
    markerLabels: Set<string>;
  },
  warnings: string[],
): void {
  if (n.kind === "ref") {
    const setMap = {
      figure: ctx.figureLabels,
      table: ctx.tableLabels,
      footnote: ctx.footnoteRefs,
      marker: ctx.markerLabels,
      passage: null,
      question: null,
    } as const;
    const set = setMap[n.refType];
    if (set && !set.has(n.target)) {
      warnings.push(
        `Unresolved ${n.refType} reference: "${n.target}"`,
      );
    }
    return;
  }
  if ("children" in n && Array.isArray(n.children)) {
    for (const c of n.children) checkRefs(c, ctx, warnings);
  }
}
