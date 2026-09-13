import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { CONFIG } from "@/lib/config";
import { NAV_LINKS } from "@/components/layout/nav-links";
import { MobileNav } from "@/components/layout/MobileNav";

export async function SiteHeader() {
  const session = await auth();
  const isSignedIn = Boolean(session?.user);

  return (
    <header className="sticky top-0 z-50 px-4 pt-4">
      <div className="glass-nav relative max-w-4xl mx-auto px-5 sm:px-6 py-3 rounded-full flex items-center justify-between gap-3">
        <Link href="/" className="font-display text-lg whitespace-nowrap">
          {CONFIG.platformName}
        </Link>
        <nav className="hidden sm:flex items-center flex-wrap gap-x-1 gap-y-1 text-sm">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="text-graphite hover:text-ink px-3 py-1.5 rounded-full hover:bg-white/50 transition-colors">
              {link.label}
            </Link>
          ))}
          {isSignedIn ? (
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
        <MobileNav
          isSignedIn={isSignedIn}
          onSignOut={async () => {
            "use server";
            await signOut();
          }}
        />
      </div>
    </header>
  );
}
