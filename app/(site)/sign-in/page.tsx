import { signIn } from "@/lib/auth";
import { CONFIG } from "@/lib/config";

export default function SignInPage() {
  const providersConfigured = Boolean(process.env.AUTH_RESEND_KEY || (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET));

  return (
    <main className="max-w-sm mx-auto px-6 py-24">
      <h1 className="font-display text-3xl mb-6">Sign in to {CONFIG.platformName}</h1>

      {!providersConfigured && (
        <p className="text-sm text-graphite mb-6 rounded-lg bg-marble p-4">
          No auth providers are configured yet in this environment (no Resend or Google credentials, see REVIEW.md). Sign-in will not work until
          one is supplied.
        </p>
      )}

      {process.env.AUTH_RESEND_KEY && (
        <form
          action={async (formData) => {
            "use server";
            await signIn("resend", { email: formData.get("email") });
          }}
          className="mb-4"
        >
          <input type="email" name="email" required placeholder="you@example.com" className="w-full border border-mist rounded-lg px-4 py-3 mb-3" />
          <button className="w-full rounded-full bg-ink text-paper px-6 py-3 text-sm font-medium" type="submit">
            Email me a sign-in link
          </button>
        </form>
      )}

      {process.env.AUTH_GOOGLE_ID && (
        <form
          action={async () => {
            "use server";
            await signIn("google");
          }}
        >
          <button className="w-full rounded-full border border-mist px-6 py-3 text-sm font-medium" type="submit">
            Continue with Google
          </button>
        </form>
      )}
    </main>
  );
}
