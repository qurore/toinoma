import { redirect } from "next/navigation";

/**
 * Legacy redirect: /seller/[id]/edit → /seller/sets/[id]/edit
 * Routes were restructured to avoid namespace collision with public seller profiles.
 */
export default async function LegacyEditRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/seller/sets/${id}/edit`);
}
