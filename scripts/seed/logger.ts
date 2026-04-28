const PREFIX = "[seed:utokyo-2026]";

export interface LogContext {
  phase: string;
  subject?: string;
  q?: number | string;
}

export function log(ctx: LogContext, message: string): void {
  const ctxParts = [`phase=${ctx.phase}`];
  if (ctx.subject) ctxParts.push(`subject=${ctx.subject}`);
  if (ctx.q !== undefined) ctxParts.push(`q=${ctx.q}`);
  console.log(`${PREFIX} [${ctxParts.join(" ")}] ${message}`);
}

export function progress(
  ctx: LogContext,
  current: number,
  total: number,
  message: string
): void {
  const ctxParts = [`phase=${ctx.phase}`];
  if (ctx.subject) ctxParts.push(`subject=${ctx.subject}`);
  console.log(
    `${PREFIX} [${ctxParts.join(" ")}] (${current}/${total}) ${message}`
  );
}

export interface SeedFailure {
  phase: string;
  subject?: string;
  q?: number | string;
  reason: string;
  detail?: string;
  file?: string;
  fix: string;
}

export function fail(failure: SeedFailure): never {
  const ctxParts = [`phase=${failure.phase}`];
  if (failure.subject) ctxParts.push(`subject=${failure.subject}`);
  if (failure.q !== undefined) ctxParts.push(`q=${failure.q}`);
  console.error(`${PREFIX} [${ctxParts.join(" ")}] FAILED: ${failure.reason}`);
  if (failure.detail) console.error(`  Detail: ${failure.detail}`);
  if (failure.file) console.error(`  File: ${failure.file}`);
  console.error(`  Fix: ${failure.fix}`);
  process.exit(1);
}
