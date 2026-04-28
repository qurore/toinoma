import { readFile, stat } from "node:fs/promises";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@toinoma/shared/types";
import { log } from "./logger";

export const PROBLEM_PDFS_BUCKET = "problem-pdfs" as const;

export async function ensureBucketExists(
  supabase: SupabaseClient<Database>,
  bucketId: string
): Promise<void> {
  const { data, error } = await supabase.storage.getBucket(bucketId);
  if (error || !data) {
    throw new Error(
      `Storage bucket "${bucketId}" not accessible: ${error?.message ?? "not found"}. ` +
        `Run \`supabase db reset\` (which executes migrations including 20260213090000_storage_buckets.sql).`
    );
  }
  log({ phase: "storage" }, `bucket OK: ${bucketId} (public=${data.public}, size_limit=${data.file_size_limit})`);
}

export interface UploadResult {
  publicUrl: string;
  uploaded: boolean;
  bytes: number;
}

export async function uploadPdfIdempotent(
  supabase: SupabaseClient<Database>,
  bucketId: string,
  objectPath: string,
  localPath: string
): Promise<UploadResult> {
  const fileStat = await stat(localPath);
  const fileBytes = fileStat.size;

  const dirPath = objectPath.includes("/")
    ? objectPath.substring(0, objectPath.lastIndexOf("/"))
    : "";
  const fileName = objectPath.includes("/")
    ? objectPath.substring(objectPath.lastIndexOf("/") + 1)
    : objectPath;

  const { data: existing } = await supabase.storage
    .from(bucketId)
    .list(dirPath, { limit: 100, search: fileName });

  const found = existing?.find((f) => f.name === fileName);
  if (found && found.metadata?.size === fileBytes) {
    const publicUrl = supabase.storage
      .from(bucketId)
      .getPublicUrl(objectPath).data.publicUrl;
    return { publicUrl, uploaded: false, bytes: fileBytes };
  }

  const fileBuffer = await readFile(localPath);
  const { error } = await supabase.storage
    .from(bucketId)
    .upload(objectPath, fileBuffer, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (error) {
    throw new Error(`Upload failed for ${objectPath}: ${error.message}`);
  }

  const publicUrl = supabase.storage
    .from(bucketId)
    .getPublicUrl(objectPath).data.publicUrl;
  return { publicUrl, uploaded: true, bytes: fileBytes };
}

export async function deleteAllSellerObjects(
  supabase: SupabaseClient<Database>,
  bucketId: string,
  sellerUid: string
): Promise<number> {
  const prefix = `${sellerUid}/utokyo-2026`;
  const subjectFolders = await supabase.storage
    .from(bucketId)
    .list(prefix, { limit: 100 });
  if (subjectFolders.error) {
    log({ phase: "reset" }, `storage list failed (${prefix}): ${subjectFolders.error.message}`);
    return 0;
  }
  const paths: string[] = [];
  for (const folder of subjectFolders.data ?? []) {
    if (!folder.name) continue;
    const files = await supabase.storage
      .from(bucketId)
      .list(`${prefix}/${folder.name}`, { limit: 100 });
    for (const file of files.data ?? []) {
      paths.push(`${prefix}/${folder.name}/${file.name}`);
    }
  }
  if (paths.length === 0) return 0;
  const { error } = await supabase.storage.from(bucketId).remove(paths);
  if (error) {
    log({ phase: "reset" }, `storage remove failed: ${error.message}`);
    return 0;
  }
  log({ phase: "reset" }, `storage: deleted ${paths.length} objects`);
  return paths.length;
}
