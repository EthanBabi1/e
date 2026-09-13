import { requireAdmin } from "@/lib/admin/requireAdmin";
import { ImpersonateSearch } from "./ImpersonateSearch";

export const dynamic = "force-dynamic";

export default async function ImpersonatePage() {
  await requireAdmin();

  return (
    <main className="max-w-lg mx-auto px-6 py-16">
      <h1 className="font-display text-4xl mb-2">Support view</h1>
      <p className="text-graphite mb-8 text-sm">
        Read-only, for support: every lookup here is written to the audit log. See DECISIONS.md for why this doesn&apos;t do a full session
        takeover.
      </p>
      <ImpersonateSearch />
    </main>
  );
}
