import { redirect } from "next/navigation";

/** The member leaderboard was replaced by Personal Training (with its own trainer leaderboard). */
export default function LeaderboardPage() {
  redirect("/pt");
}
