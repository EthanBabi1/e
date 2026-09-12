/** Renders a JSON-LD script tag. Section 9 DoD requirement: every racer,
 * track and race page carries structured data (Person/SportsEvent/
 * Organization respectively). */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  );
}
