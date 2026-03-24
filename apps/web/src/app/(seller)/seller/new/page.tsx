import { redirect } from "next/navigation";

/**
 * Legacy route: /seller/new
 * All links now point to /seller/sets/new. Redirect any remaining traffic.
 */
export default function LegacyCreateProblemSetPage() {
  redirect("/seller/sets/new");
}
