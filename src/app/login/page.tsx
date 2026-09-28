import { redirect } from "next/navigation";
import { Alert } from "@/components/ui";
import { getCurrentUser } from "@/lib/session";
import { signInWithGoogle } from "./actions";
import { EmailForm } from "./email-form";
import { LoginShell } from "./login-shell";

export const metadata = { title: "Log in" };

export default async function LoginPage(props: PageProps<"/login">) {
  if (await getCurrentUser()) redirect("/dashboard");
  const { error } = await props.searchParams;

  return (
    <LoginShell>
      <h1 className="font-serif text-5xl leading-none font-normal text-ink">Welcome back</h1>
      <p className="mt-2.5 text-[15px] text-muted">Log in or create your free account.</p>

      {typeof error === "string" && (
        <div className="mt-5">
          <Alert>{error}</Alert>
        </div>
      )}

      <form className="mt-8" action={signInWithGoogle}>
        <button
          type="submit"
          className="flex h-12 w-full items-center justify-center gap-2.5 rounded-xl border border-line-strong bg-card text-[15px] font-semibold text-ink transition-colors hover:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <GoogleMark />
          Continue with Google
        </button>
        <p className="mt-2.5 text-center text-xs text-muted">Also connects your Google Calendar in the same step.</p>
      </form>
      <div className="my-7 flex items-center gap-3 font-mono text-[11px] text-muted" aria-hidden>
        <span className="h-px flex-1 bg-line" />
        OR
        <span className="h-px flex-1 bg-line" />
      </div>
      <EmailForm />
    </LoginShell>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="h-[18px] w-[18px]" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}
