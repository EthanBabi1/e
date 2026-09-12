/**
 * Section 4/0: placed above the results, because at grassroots level the
 * story is what sells, results are the credibility evidence. Only renders
 * when there's actual bio/story text — a blank "tell your story" prompt on
 * someone else's public profile would be an empty module (section 1).
 */
export function Story({ bio, story }: { bio: string | null; story: string | null }) {
  if (!bio && !story) return null;
  return (
    <section className="max-w-3xl mx-auto px-6 py-12">
      {story && <p className="font-display text-2xl leading-relaxed mb-4">{story}</p>}
      {bio && <p className="text-graphite leading-relaxed">{bio}</p>}
    </section>
  );
}
