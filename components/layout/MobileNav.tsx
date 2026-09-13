"use client";

import Link from "next/link";
import { useState } from "react";
import { NAV_LINKS } from "@/components/layout/nav-links";

export function MobileNav({
  isSignedIn,
  onSignOut,
}: {
  isSignedIn: boolean;
  onSignOut: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="sm:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Toggle menu"
        className="flex flex-col items-center justify-center gap-[5px] w-9 h-9 -mr-1 rounded-full hover:bg-white/50 transition-colors shrink-0"
      >
        <span className={`block h-0.5 w-4 bg-ink transition-transform ${open ? "translate-y-[6.5px] rotate-45" : ""}`} />
        <span className={`block h-0.5 w-4 bg-ink transition-opacity ${open ? "opacity-0" : ""}`} />
        <span className={`block h-0.5 w-4 bg-ink transition-transform ${open ? "-translate-y-[6.5px] -rotate-45" : ""}`} />
      </button>

      {open && (
        <div className="glass-nav absolute left-0 right-0 top-full mt-2 rounded-2xl p-2 flex flex-col text-sm">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="text-graphite hover:text-ink px-4 py-2.5 rounded-xl hover:bg-white/50 transition-colors"
            >
              {l.label}
            </Link>
          ))}
          {isSignedIn ? (
            <>
              <Link
                href="/dashboard"
                onClick={() => setOpen(false)}
                className="text-graphite hover:text-ink px-4 py-2.5 rounded-xl hover:bg-white/50 transition-colors"
              >
                Dashboard
              </Link>
              <button
                type="button"
                onClick={async () => {
                  setOpen(false);
                  await onSignOut();
                }}
                className="text-left text-graphite hover:text-ink px-4 py-2.5 rounded-xl hover:bg-white/50 transition-colors"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link
              href="/sign-in"
              onClick={() => setOpen(false)}
              className="text-graphite hover:text-ink px-4 py-2.5 rounded-xl hover:bg-white/50 transition-colors"
            >
              Sign in
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
