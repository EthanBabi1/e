import Link from "next/link";
import { CONFIG } from "@/lib/config";

/**
 * Placeholder landing page for Phase 0. The full marketing homepage (hero,
 * story, live marketplace) is built in Phase 3 per the brief's sequencing —
 * this exists so `pnpm dev` doesn't show the create-next-app template while
 * the foundation is being laid.
 */
export default function Home() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-24">
      <p className="label-small mb-4">Phase 0 — foundation</p>
      <h1 className="font-display text-5xl mb-4">{CONFIG.platformName}</h1>
      <p className="text-graphite mb-8 max-w-xl">
        This is a development build. Public marketing pages, the marketplace
        and racer profiles ship in Phase 3. In the meantime:
      </p>
      <ul className="space-y-2">
        <li>
          <Link className="accent-underline" href="/style">
            /style — rendered design tokens
          </Link>
        </li>
      </ul>
    </main>
  );
}
