import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type TypedSupabaseClient = SupabaseClient<Database>;

// Bucket identifiers — must match the migration
const BUCKETS = {
  PROBLEM_PDFS: "problem-pdfs",
  ANSWER_IMAGES: "answer-images",
} as const;

/**
 * Upload a problem or solution PDF to Supabase Storage.
 *
 * Path convention: `{sellerId}/{problemSetId}/{type}.pdf`
 * The first folder segment equals the seller's user ID so that RLS
 * policies can enforce ownership via `storage.foldername(name)[1]`.
 *
 * @returns The public URL of the uploaded file.
 */
export async function uploadProblemPDF(
  supabase: TypedSupabaseClient,
  file: File,
  sellerId: string,
  problemSetId: string,
  type: "problem" | "solution"
): Promise<string> {
  const path = `${sellerId}/${problemSetId}/${type}.pdf`;

  const { error } = await supabase.storage
    .from(BUCKETS.PROBLEM_PDFS)
    .upload(path, file, { upsert: true, contentType: "application/pdf" });

  if (error) {
    throw new Error(`Failed to upload problem PDF: ${error.message}`);
  }

  return getPublicUrl(supabase, BUCKETS.PROBLEM_PDFS, path);
}

/**
 * Upload a handwritten answer image to Supabase Storage.
 *
 * Path convention: `{userId}/{submissionId}/{timestamp}.{ext}`
 * A timestamp suffix avoids collisions when a user re-submits.
 *
 * @returns The path (not a public URL, since the bucket is private).
 */
export async function uploadAnswerImage(
  supabase: TypedSupabaseClient,
  file: File,
  userId: string,
  submissionId: string
): Promise<string> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const timestamp = Date.now();
  const path = `${userId}/${submissionId}/${timestamp}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKETS.ANSWER_IMAGES)
    .upload(path, file, { upsert: true });

  if (error) {
    throw new Error(`Failed to upload answer image: ${error.message}`);
  }

  // answer-images is a private bucket — return the storage path.
  // Callers should use `createSignedUrl` when they need to display the image.
  return path;
}

/**
 * Get the public URL for a file in a **public** bucket.
 *
 * For private buckets (e.g. answer-images), use `createSignedUrl` instead.
 */
export function getPublicUrl(
  supabase: TypedSupabaseClient,
  bucket: string,
  path: string
): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Create a time-limited signed URL for a file in a **private** bucket.
 *
 * @param expiresIn — Seconds until the URL expires (default: 3600 = 1 hour).
 * @returns A signed URL string.
 */
export async function createSignedUrl(
  supabase: TypedSupabaseClient,
  bucket: string,
  path: string,
  expiresIn = 3600
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error || !data?.signedUrl) {
    throw new Error(`Failed to create signed URL: ${error?.message ?? "unknown error"}`);
  }

  return data.signedUrl;
}

/**
 * Delete a file from a storage bucket.
 *
 * @returns `true` on success, throws on failure.
 */
export async function deleteFile(
  supabase: TypedSupabaseClient,
  bucket: string,
  path: string
): Promise<true> {
  const { error } = await supabase.storage.from(bucket).remove([path]);

  if (error) {
    throw new Error(`Failed to delete file: ${error.message}`);
  }

  return true;
}

export { BUCKETS };
