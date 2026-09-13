import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { CONFIG } from "@/lib/config";

export async function SiteHeader() {
  const session = await auth();

  return (
    <header className="sticky top-0 z-50 px-4 pt-4">
      <div className="glass-nav max-w-4xl mx-auto px-6 py-3 rounded-full flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <Link href="/" className="font-display text-lg whitespace-nowrap">
          {CONFIG.platformName}
        </Link>
        <nav className="flex items-center flex-wrap gap-x-1 gap-y-1 text-sm">
          <Link href="/marketplace" className="text-graphite hover:text-ink px-3 py-1.5 rounded-full hover:bg-white/50 transition-colors">
            Marketplace
          </Link>
          <Link href="/leaderboards" className="text-graphite hover:text-ink px-3 py-1.5 rounded-full hover:bg-white/50 transition-colors">
            Leaderboards
          </Link>
          <Link href="/search" className="text-graphite hover:text-ink px-3 py-1.5 rounded-full hover:bg-white/50 transition-colors">
            Search
          </Link>
          {session?.user ? (
            <>
              <Link href="/dashboard" className="text-graphite hover:text-ink px-3 py-1.5 rounded-full hover:bg-white/50 transition-colors">
                Dashboard
              </Link>
              <form
                action={async () => {
                  "use server";
                  await signOut();
                }}
              >
                <button className="text-graphite hover:text-ink px-3 py-1.5 rounded-full hover:bg-white/50 transition-colors" type="submit">
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <Link href="/sign-in" className="text-graphite hover:text-ink px-3 py-1.5 rounded-full hover:bg-white/50 transition-colors">
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
