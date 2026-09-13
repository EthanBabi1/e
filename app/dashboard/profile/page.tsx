import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getManagedRacers } from "@/lib/dashboard/getCurrentRacer";
import { ProfileEditForm } from "./ProfileEditForm";

export const dynamic = "force-dynamic";

export default async function ProfileEditPage({ searchParams }: { searchParams: Promise<{ racerId?: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in?callbackUrl=/dashboard/profile");

  const { racerId } = await searchParams;
  const managed = await getManagedRacers(session.user.id);
  const racer = managed.find((r) => r.id === racerId) ?? managed[0];

  if (!racer) {
    return (
      <main className="max-w-lg mx-auto px-6 py-24 text-center">
        <p className="text-graphite">No racer profile is linked to your account yet.</p>
      </main>
    );
  }

  return (
    <main className="max-w-lg mx-auto px-6 py-16">
      <h1 className="font-display text-3xl mb-2">Edit {racer.firstName}&apos;s story</h1>
      <p className="text-graphite mb-8 text-sm">
        This is what shows above the results on the public profile — section 0&apos;s point: at this level, the story is what sells, results are the
        evidence.
      </p>
      <ProfileEditForm
        racerId={racer.id}
        initial={{ bio: racer.bio, story: racer.story, seasonGoal: racer.seasonGoal }}
      />
    </main>
  );
}
