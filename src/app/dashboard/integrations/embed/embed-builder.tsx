"use client";

import { Check, Copy, MousePointerClick, PanelsTopLeft, Rows3 } from "lucide-react";
import Script from "next/script";
import { useMemo, useState } from "react";
import { Card, Field, Input, Select, cx } from "@/components/ui";

type Mode = "inline" | "badge" | "text";
type Target = { label: string; path: string; slug?: string };

const MODES: { id: Mode; title: string; body: string; icon: typeof Rows3 }[] = [
  { id: "inline", title: "Inline", body: "Inside your page", icon: Rows3 },
  { id: "badge", title: "Popup widget", body: "Floating button", icon: PanelsTopLeft },
  { id: "text", title: "Popup text", body: "A text link", icon: MousePointerClick },
];

declare global {
  interface Window {
    Schedulo?: {
      initPopupWidget: (o: Record<string, unknown>) => void;
      initBadgeWidget: (o: Record<string, unknown>) => void;
    };
  }
}

export function EmbedBuilder({ base, brandColor, profile, events, initialSlug }: {
  base: string;
  brandColor: string;
  profile: Target;
  events: Target[];
  initialSlug?: string;
}) {
  const targets = [...events, profile];
  const [mode, setMode] = useState<Mode>("inline");
  const [path, setPath] = useState(targets.find((t) => t.slug === initialSlug)?.path ?? targets[0].path);
  const [hideDetails, setHideDetails] = useState(false);
  const [color, setColor] = useState(brandColor);
  const [buttonText, setButtonText] = useState("Schedule time with me");
  const [textColor, setTextColor] = useState("#ffffff");
  const [linkText, setLinkText] = useState("Schedule time with me");
  const [copied, setCopied] = useState(false);

  const url = useMemo(() => {
    const u = new URL(path, base);
    if (hideDetails) u.searchParams.set("hide_event_type_details", "1");
    if (color.toLowerCase() !== brandColor.toLowerCase()) u.searchParams.set("primary_color", color.replace("#", ""));
    return u.toString();
  }, [path, base, hideDetails, color, brandColor]);

  const scriptTag = `<script src="${base}/embed.js" async></script>`;
  const code =
    mode === "inline"
      ? `<!-- Schedulo inline widget begin -->\n<div class="schedulo-inline-widget" data-url="${url}" style="min-width:320px;height:700px;"></div>\n${scriptTag}\n<!-- Schedulo inline widget end -->`
      : mode === "badge"
        ? `<!-- Schedulo badge widget begin -->\n${scriptTag}\n<script>\n  window.addEventListener("load", function () {\n    Schedulo.initBadgeWidget({ url: "${url}", text: ${JSON.stringify(buttonText)}, color: "${color}", textColor: "${textColor}" });\n  });\n</script>\n<!-- Schedulo badge widget end -->`
        : `<!-- Schedulo link widget begin -->\n${scriptTag}\n<a href="" onclick="Schedulo.initPopupWidget({ url: '${url}' }); return false;">${linkText.replace(/</g, "&lt;")}</a>\n<!-- Schedulo link widget end -->`;

  const previewSrc = useMemo(() => {
    const u = new URL(url);
    u.searchParams.set("embed", "1");
    return u.toString();
  }, [url]);

  const modeCard = (on: boolean) =>
    cx("rounded-[14px] border-[1.5px] bg-card p-3.5 text-left transition-colors", on ? "border-primary" : "border-line hover:border-line-strong");

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))] items-start gap-5">
      <Script src="/embed.js" strategy="afterInteractive" />
      <div className="flex min-w-0 flex-col gap-4">
        <div className="grid grid-cols-3 gap-2.5" role="radiogroup" aria-label="Embed type">
          {MODES.map((m) => (
            <button key={m.id} type="button" role="radio" aria-checked={mode === m.id} onClick={() => setMode(m.id)} className={modeCard(mode === m.id)}>
              <m.icon className={cx("h-5 w-5", mode === m.id ? "text-primary" : "text-ink-soft")} aria-hidden />
              <p className="mt-2.5 text-sm font-semibold text-ink">{m.title}</p>
              <p className="mt-0.5 text-xs text-muted">{m.body}</p>
            </button>
          ))}
        </div>

        <Card className="flex flex-col gap-4 rounded-[14px] px-[18px] py-4">
          <Field label="Page to embed" htmlFor="embed-target">
            <Select id="embed-target" value={path} onChange={(e) => setPath(e.target.value)} className="h-10 text-sm">
              {targets.map((t) => (
                <option key={t.path} value={t.path}>
                  {t.label}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex flex-wrap items-end gap-5">
            <Field label="Accent color" htmlFor="embed-color">
              <input id="embed-color" type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-9 w-16 cursor-pointer rounded-lg border border-line-strong bg-card" />
            </Field>
            {mode === "badge" && (
              <Field label="Text color" htmlFor="embed-text-color">
                <input id="embed-text-color" type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} className="h-9 w-16 cursor-pointer rounded-lg border border-line-strong bg-card" />
              </Field>
            )}
            <label className="flex h-9 items-center gap-2 text-sm text-ink">
              <input type="checkbox" checked={hideDetails} onChange={(e) => setHideDetails(e.target.checked)} className="h-4 w-4 accent-primary" />
              Hide event details
            </label>
          </div>
          {mode === "badge" && (
            <Field label="Button text" htmlFor="embed-btn-text">
              <Input id="embed-btn-text" value={buttonText} maxLength={60} onChange={(e) => setButtonText(e.target.value)} className="h-10 text-sm" />
            </Field>
          )}
          {mode === "text" && (
            <Field label="Link text" htmlFor="embed-link-text">
              <Input id="embed-link-text" value={linkText} maxLength={80} onChange={(e) => setLinkText(e.target.value)} className="h-10 text-sm" />
            </Field>
          )}
        </Card>

        <div className="overflow-hidden rounded-[14px] bg-code">
          <div className="flex items-center justify-between border-b border-[#2c322f] py-2.5 pr-3 pl-4">
            <span className="font-mono text-[11px] text-[#9ba19d]">HTML</span>
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(code);
                setCopied(true);
                setTimeout(() => setCopied(false), 1400);
              }}
              className="flex h-[30px] items-center gap-1.5 rounded-lg bg-surface px-3 text-xs font-semibold text-code hover:bg-primary-soft"
            >
              {copied ? <Check className="h-[13px] w-[13px]" /> : <Copy className="h-[13px] w-[13px]" />}
              <span aria-live="polite">{copied ? "Copied" : "Copy code"}</span>
            </button>
          </div>
          <pre className="m-0 p-4 font-mono text-[12.5px] leading-[1.65] break-all whitespace-pre-wrap text-[#d8dcd9]">
            <code>{code}</code>
          </pre>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-card">
        <div className="flex items-center gap-1.5 border-b border-line-soft px-3.5 py-2.5" aria-hidden>
          <span className="h-[9px] w-[9px] rounded-full bg-line" />
          <span className="h-[9px] w-[9px] rounded-full bg-line" />
          <span className="h-[9px] w-[9px] rounded-full bg-line" />
          <span className="ml-2.5 font-mono text-[11px] text-muted">yoursite.com — live preview</span>
        </div>
        <div className="relative bg-[#f6f4ef] p-[22px]">
          <div aria-hidden>
            <div className="h-3 w-2/5 rounded bg-line" />
            <div className="mt-2.5 h-2 w-[70%] rounded bg-[#ebe8e0]" />
            <div className="mt-1.5 h-2 w-3/5 rounded bg-[#ebe8e0]" />
          </div>
          {mode === "inline" ? (
            <iframe key={previewSrc} src={previewSrc} title="Inline embed preview" className="mt-5 h-[640px] w-full rounded-xl border border-line bg-card" />
          ) : mode === "badge" ? (
            <div className="relative h-[380px]">
              <p className="pt-6 text-sm text-muted">Click the floating button to open your booking page.</p>
              <button
                type="button"
                onClick={() => window.Schedulo?.initPopupWidget({ url })}
                className="absolute right-0 bottom-0 h-11 rounded-full px-[18px] text-sm font-semibold shadow-[0_10px_24px_-8px_rgba(0,0,0,.4)]"
                style={{ background: color, color: textColor }}
              >
                {buttonText}
              </button>
            </div>
          ) : (
            <div className="h-[380px]">
              <p className="mt-5 text-sm text-ink-soft">
                Want to chat?{" "}
                <button type="button" onClick={() => window.Schedulo?.initPopupWidget({ url })} className="font-semibold underline" style={{ color }}>
                  {linkText}
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
