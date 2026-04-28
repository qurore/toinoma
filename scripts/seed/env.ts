import { config as loadDotenv } from "dotenv";
import { resolve, join } from "node:path";
import { existsSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@toinoma/shared/types";

const REPO_ROOT = resolve(__dirname, "..", "..");
const ENV_LOAD_ORDER = [
  ".env.local",
  "apps/web/.env.local",
  "apps/web/.env",
];

export interface SeedEnv {
  supabaseUrl: string;
  serviceRoleKey: string;
  fixturesRoot: string;
  isLocalhost: boolean;
  resolvedEnvFile: string;
  urlSource: "shell" | "dotenv" | "missing";
}

export function loadEnv(opts: { allowRemote: boolean }): SeedEnv {
  const shellSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const shellServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  let resolvedEnvFile = "";
  for (const candidate of ENV_LOAD_ORDER) {
    const path = join(REPO_ROOT, candidate);
    if (existsSync(path)) {
      // override:false ensures shell-set vars win, so we can detect their source.
      loadDotenv({ path, override: false });
      resolvedEnvFile = path;
      break;
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const urlSource: SeedEnv["urlSource"] = !supabaseUrl
    ? "missing"
    : shellSupabaseUrl === supabaseUrl
      ? "shell"
      : "dotenv";

  if (!supabaseUrl) {
    throw new SeedEnvError(
      "NEXT_PUBLIC_SUPABASE_URL is not set.",
      `Checked: ${ENV_LOAD_ORDER.map((p) => join(REPO_ROOT, p)).join(", ")}; shell env had no value either.`,
      `Add NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 to apps/web/.env.local and re-run.`
    );
  }
  if (!serviceRoleKey) {
    throw new SeedEnvError(
      "SUPABASE_SERVICE_ROLE_KEY is not set.",
      `URL source=${urlSource}. Loaded env file: ${resolvedEnvFile || "(none found)"}; shell had no value.`,
      `Run \`supabase status\` to print the local service_role key, then add it to apps/web/.env.local.`
    );
  }

  const isLocalhost =
    supabaseUrl.startsWith("http://localhost") ||
    supabaseUrl.startsWith("http://127.0.0.1");

  if (!isLocalhost && !opts.allowRemote) {
    throw new SeedEnvError(
      `Refusing to seed non-localhost Supabase URL: ${supabaseUrl}`,
      `URL source=${urlSource} (${urlSource === "shell" ? "exported in your shell — fix there or unset" : urlSource === "dotenv" ? `loaded from ${resolvedEnvFile}` : "(missing)"}). This script is intended for local development only.`,
      `If you really mean to seed a remote project, re-run with --allow-remote (you will be required to confirm).`
    );
  }

  const fixturesRoot = join(REPO_ROOT, "fixtures", "utokyo-2026");
  if (!existsSync(fixturesRoot)) {
    throw new SeedEnvError(
      `Fixtures directory not found: ${fixturesRoot}`,
      "Expected 11 subject folders containing problem.pdf / answer.pdf / analysis.pdf.",
      `Create the directory and place PDFs, or check that you are running from the repo root.`
    );
  }

  return {
    supabaseUrl,
    serviceRoleKey,
    fixturesRoot,
    isLocalhost,
    resolvedEnvFile,
    urlSource,
  };
}

export function createSeedAdminClient(
  env: SeedEnv
): SupabaseClient<Database> {
  return createClient<Database>(env.supabaseUrl, env.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// A schema-erased view of the supabase client used inside the seed.
// The seed tolerates degraded schemas where some columns/tables present in
// the generated Database types may be absent at runtime; capability detection
// guards each insert/update so this looser typing is safe in this context.
export type SeedRawClient = {
  from: (table: string) => {
    select: (cols: string) => {
      eq: (k: string, v: string) => {
        eq: (k: string, v: string) => {
          maybeSingle: () => Promise<{
            data: { id: string } | null;
            error: { message: string } | null;
          }>;
        };
        maybeSingle: () => Promise<{
          data: { id: string } | null;
          error: { message: string } | null;
        }>;
        in: (k: string, v: string[]) => Promise<{
          data: { id: string }[] | null;
          error: { message: string } | null;
        }>;
        single: () => Promise<{
          data: { id: string } | null;
          error: { message: string } | null;
        }>;
      };
      contains: (k: string, v: string[]) => {
        maybeSingle: () => Promise<{
          data: { id: string } | null;
          error: { message: string } | null;
        }>;
      };
    };
    update: (v: Record<string, unknown>) => {
      eq: (k: string, v: string) => Promise<{ error: { message: string } | null }>;
    };
    insert: (v: Record<string, unknown>) => {
      select: (cols: string) => {
        single: () => Promise<{
          data: { id: string } | null;
          error: { message: string } | null;
        }>;
      };
    };
    upsert: (
      v: Record<string, unknown> | Record<string, unknown>[],
      opts?: { onConflict?: string; ignoreDuplicates?: boolean }
    ) => Promise<{ error: { message: string } | null }>;
    delete: () => {
      eq: (k: string, v: string) => Promise<{ error: { message: string } | null }>;
      in: (k: string, v: string[]) => Promise<{ error: { message: string } | null }>;
    };
  };
};

export function asRawClient(supabase: SupabaseClient<Database>): SeedRawClient {
  return supabase as unknown as SeedRawClient;
}

export class SeedEnvError extends Error {
  constructor(
    public readonly summary: string,
    public readonly detail: string,
    public readonly fix: string
  ) {
    super(summary);
    this.name = "SeedEnvError";
  }
}

const REQUIRED_TABLES = ["problem_sets", "seller_profiles", "profiles"] as const;
const ENRICHMENT_TABLES = [
  "questions",
  "problem_set_questions",
  "notification_preferences",
] as const;

export interface SchemaCapabilities {
  hasCore: boolean;
  hasQuestions: boolean;
  hasJunction: boolean;
  hasNotificationPreferences: boolean;
  problemSetColumns: Set<string>;
  missing: string[];
}

interface OpenApiSpec {
  paths?: Record<string, unknown>;
  definitions?: Record<string, { properties?: Record<string, unknown> }>;
}

export async function detectSchemaCapabilities(
  env: SeedEnv
): Promise<SchemaCapabilities> {
  const response = await fetch(`${env.supabaseUrl}/rest/v1/`, {
    headers: {
      apikey: env.serviceRoleKey,
      Authorization: `Bearer ${env.serviceRoleKey}`,
    },
  });
  const spec = (await response.json()) as OpenApiSpec;
  const paths = new Set(Object.keys(spec.paths ?? {}).map((p) => p.replace(/^\//, "")));

  const missing: string[] = [];
  for (const t of [...REQUIRED_TABLES, ...ENRICHMENT_TABLES]) {
    if (!paths.has(t)) missing.push(t);
  }

  const problemSetColumns = new Set(
    Object.keys(spec.definitions?.problem_sets?.properties ?? {})
  );

  return {
    hasCore: REQUIRED_TABLES.every((t) => paths.has(t)),
    hasQuestions: paths.has("questions"),
    hasJunction: paths.has("problem_set_questions"),
    hasNotificationPreferences: paths.has("notification_preferences"),
    problemSetColumns,
    missing,
  };
}
