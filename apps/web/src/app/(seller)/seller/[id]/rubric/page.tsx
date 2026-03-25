import { redirect } from "next/navigation";

export default async function LegacyRubricRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/seller/sets/${id}/rubric`);
}
