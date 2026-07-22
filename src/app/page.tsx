// Kept as a Server Component so we can force dynamic rendering — this
// dashboard is per-user data behind auth, so it must never be statically
// cached/prerendered (which would also require Supabase env vars at build
// time). The actual UI lives in HomeClient.
import HomeClient from "@/components/home-client";

export const dynamic = "force-dynamic";

export default function Page() {
  return <HomeClient />;
}
