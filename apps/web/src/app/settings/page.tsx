import { redirect } from "next/navigation";

// Redirect to the first settings section
export default function SettingsPage() {
  redirect("/settings/profile");
}
