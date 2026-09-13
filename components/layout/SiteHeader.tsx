import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { CONFIG } from "@/lib/config";

export async function SiteHeader() {
  const session = await auth();

  return (
    <header className="border-b border-mist">
      <div className="max-w-5xl mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <Link href="/" className="font-display text-lg whitespace-nowrap">
          {CONFIG.platformName}
        </Link>
        <nav className="flex items-center flex-wrap gap-x-4 gap-y-1 text-sm">
          <Link href="/marketplace" className="text-graphite hover:text-ink">
            Marketplace
          </Link>
          <Link href="/leaderboards" className="text-graphite hover:text-ink">
            Leaderboards
          </Link>
          <Link href="/search" className="text-graphite hover:text-ink">
            Search
          </Link>
          {session?.user ? (
            <>
              <Link href="/dashboard" className="text-graphite hover:text-ink">
                Dashboard
              </Link>
              <form
                action={async () => {
                  "use server";
                  await signOut();
                }}
              >
                <button className="text-graphite hover:text-ink" type="submit">
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <Link href="/sign-in" className="text-graphite hover:text-ink">
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
