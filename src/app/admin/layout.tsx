import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/supabase/admin";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  // Server-side gate: non-admins never see admin UI. Write APIs re-check too.
  if (!isAdminEmail(user.email)) redirect("/");

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-black/10 px-5 py-4 dark:border-white/10">
        <Link href="/admin" className="text-sm font-semibold">
          🍽️ Catalog admin
        </Link>
        <Link
          href="/"
          className="text-sm text-black/50 underline underline-offset-4 dark:text-white/50"
        >
          Exit
        </Link>
      </header>
      {children}
    </div>
  );
}
