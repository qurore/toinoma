import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/admin";
import type { Metadata } from "next";
import type { Database } from "@/types/database";
import { AnnouncementsClient } from "./announcements-client";

export const metadata: Metadata = {
  title: "お知らせ管理 - 問の間",
};

type AnnouncementDbRow = Database["public"]["Tables"]["announcements"]["Row"];

export interface AnnouncementRow {
  id: string;
  title: string;
  body: string;
  target: string;
  published: boolean;
  published_at: string | null;
  created_at: string;
  admin_name: string | null;
}

export default async function AdminAnnouncementsPage() {
  await requireAdmin();

  const admin = createAdminClient();

  // Fetch all announcements ordered by creation date
  const { data: announcements } = await admin
    .from("announcements")
    .select("id, admin_id, title, body, target, published, published_at, created_at")
    .order("created_at", { ascending: false });

  const allAnnouncements = (announcements ?? []) as AnnouncementDbRow[];

  // Fetch admin display names for the announcements
  const adminIds = [...new Set(allAnnouncements.map((a) => a.admin_id))];
  const { data: adminProfiles } =
    adminIds.length > 0
      ? await admin
          .from("profiles")
          .select("id, display_name")
          .in("id", adminIds)
      : { data: [] };

  const adminNameMap = new Map(
    (adminProfiles ?? []).map((p) => [p.id, p.display_name])
  );

  const rows: AnnouncementRow[] = allAnnouncements.map((a) => ({
    id: a.id,
    title: a.title,
    body: a.body,
    target: a.target,
    published: a.published,
    published_at: a.published_at,
    created_at: a.created_at,
    admin_name: adminNameMap.get(a.admin_id) ?? null,
  }));

  return <AnnouncementsClient announcements={rows} />;
}
