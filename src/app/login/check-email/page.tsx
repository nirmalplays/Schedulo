import { MailCheck } from "lucide-react";
import Link from "next/link";
import { LoginShell } from "../login-shell";

export const metadata = { title: "Check your email" };

export default async function CheckEmailPage(props: PageProps<"/login/check-email">) {
  const { email } = await props.searchParams;
  return (
    <LoginShell>
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-primary" aria-hidden>
        <MailCheck className="h-6 w-6" />
      </span>
      <h1 className="mt-6 font-serif text-5xl leading-none font-normal text-ink">Check your inbox</h1>
      <p className="mt-3 text-[15px] text-ink-soft">
        We sent a sign-in link{typeof email === "string" ? <> to <span className="font-medium text-ink">{email}</span></> : null}. Open it in this browser to sign in.
      </p>
      <p className="mt-8 text-sm text-muted">
        Wrong address or no email?{" "}
        <Link href="/login" className="font-semibold text-primary hover:text-primary-hover">
          Try again
        </Link>
      </p>
    </LoginShell>
  );
}
