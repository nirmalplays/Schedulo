import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

const buttonStyles = {
  primary: "bg-primary text-[#fbfaf6] hover:bg-primary-hover disabled:bg-line-strong",
  dark: "bg-ink text-surface hover:bg-primary disabled:bg-line-strong",
  secondary: "bg-card text-ink border border-line-strong hover:border-ink",
  outline: "bg-card text-primary border border-primary-ring hover:border-primary hover:bg-primary-soft",
  danger: "bg-card text-danger border border-[#e8c9bc] hover:bg-danger-soft",
  ghost: "text-ink-soft hover:bg-hover hover:text-ink",
  brand: "bg-brand text-white hover:opacity-90 disabled:opacity-50",
};
type Variant = keyof typeof buttonStyles;
const sizes = { sm: "h-8 px-3 text-[13px] rounded-lg", md: "h-10 px-4 text-sm rounded-[10px]", lg: "h-[50px] px-6 text-[15px] rounded-xl" };
type Size = keyof typeof sizes;

const base =
  "inline-flex shrink-0 items-center justify-center gap-2 font-semibold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed";

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button className={cx(base, sizes[size], buttonStyles[variant], className)} {...props} />;
}

export function LinkButton({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={cx(base, sizes[size], buttonStyles[variant], className)} {...props} />;
}

const inputBase =
  "block w-full rounded-[10px] border border-line-strong bg-card px-3.5 py-2.5 text-[15px] text-ink placeholder:text-muted focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary-soft";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cx(inputBase, className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cx(inputBase, "min-h-24 resize-y", className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cx(inputBase, "pr-8", className)} {...props} />;
}

export function Field({ label, hint, htmlFor, children }: { label: string; hint?: ReactNode; htmlFor?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-[13px] font-semibold text-ink">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cx("rounded-2xl border border-line bg-card", className)} {...props} />;
}

/** Card header row used across settings-style cards. */
export function CardHeader({ title, description, actions }: { title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-soft px-[22px] py-[18px]">
      <div>
        <p className="text-base font-semibold text-ink">{title}</p>
        {description && <p className="mt-0.5 text-[13px] text-muted">{description}</p>}
      </div>
      {actions}
    </div>
  );
}

export function Badge({ tone = "neutral", children }: { tone?: "neutral" | "green" | "red" | "amber" | "blue"; children: ReactNode }) {
  const tones = {
    neutral: "bg-chip text-ink-soft",
    green: "bg-primary-soft text-primary-hover",
    red: "bg-danger-soft text-[#9a4424]",
    amber: "bg-warn-soft text-warn-ink",
    blue: "bg-primary-soft text-primary-hover",
  };
  return <span className={cx("inline-flex items-center rounded-full px-[9px] py-[3px] text-[11px] font-semibold", tones[tone])}>{children}</span>;
}

/** Mono chip, e.g. a slug. */
export function Chip({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-chip px-[9px] py-[3px] font-mono text-[11px] text-ink-soft">{children}</span>;
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cx("font-mono text-xs tracking-[0.08em] text-accent-ink uppercase", className)}>{children}</p>;
}

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-serif text-[44px] leading-none font-normal text-ink">{title}</h1>
        {description && <p className="mt-2 text-sm text-muted">{description}</p>}
      </div>
      {actions}
    </div>
  );
}

export function Alert({ tone = "red", children }: { tone?: "red" | "green" | "amber" | "blue"; children: ReactNode }) {
  const tones = {
    red: "border-[#e8c9bc] bg-danger-soft text-[#8a3521]",
    green: "border-[#cfe0d6] bg-[#eef5f0] text-primary-hover",
    amber: "border-[#e9dcb6] bg-warn-soft text-warn-ink",
    blue: "border-[#cfe0d6] bg-[#eef5f0] text-primary-hover",
  };
  return (
    <div role={tone === "red" ? "alert" : "status"} className={cx("rounded-[10px] border px-3.5 py-3 text-sm", tones[tone])}>
      {children}
    </div>
  );
}

export function Avatar({ name, image, size = 48 }: { name: string; image?: string | null; size?: number }) {
  if (image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={image} alt="" width={size} height={size} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />;
  }
  const initials = name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div
      aria-hidden
      className="flex shrink-0 items-center justify-center rounded-full bg-primary-soft font-semibold text-primary-hover"
      style={{ width: size, height: size, fontSize: size * 0.34 }}
    >
      {initials}
    </div>
  );
}

/** Accessible on/off switch (button with role="switch"). */
export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange?: (next: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={cx(
        "relative h-5 w-9 shrink-0 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60",
        checked ? "bg-primary" : "bg-line-strong",
      )}
    >
      <span
        className="absolute top-0.5 h-4 w-4 rounded-full bg-card shadow-[0_1px_2px_rgba(0,0,0,.2)] transition-[left]"
        style={{ left: checked ? 18 : 2 }}
      />
    </button>
  );
}

/** Tabs rendered as links (URL-driven). */
export function TabLinks({ tabs, active }: { tabs: { id: string; label: string; href: string }[]; active: string }) {
  return (
    <nav className="mb-6 flex gap-6 border-b border-line" aria-label="Tabs">
      {tabs.map((t) => (
        <Link
          key={t.id}
          href={t.href}
          aria-current={active === t.id ? "page" : undefined}
          className={cx(
            "-mb-px border-b-2 pb-3 text-sm font-semibold transition",
            active === t.id ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink",
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

export function EmptyState({ icon, title, children }: { icon?: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-line-strong px-6 py-14 text-center">
      {icon && <div className="mb-3 text-[#b9b4a8]">{icon}</div>}
      <p className="font-serif text-[28px] leading-tight text-ink">{title}</p>
      {children && <div className="mt-2 max-w-md text-sm text-muted">{children}</div>}
    </div>
  );
}

/** The Schedulo wordmark (app): serif lowercase + clay dot. */
export function Wordmark({ size = 28 }: { size?: number }) {
  return (
    <span className="inline-flex items-baseline gap-0.5">
      <span className="font-serif leading-none text-ink" style={{ fontSize: size }}>
        schedulo
      </span>
      <span className="inline-block rounded-[2px] bg-accent" style={{ width: size / 4, height: size / 4 }} aria-hidden />
    </span>
  );
}

export { cx };
