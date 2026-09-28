import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/**
 * Webhook targets are user-supplied URLs our server calls: block internal
 * addresses (SSRF). Checked on create and again before every send.
 */

function isPrivateV4(ip: string) {
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) || // CGNAT
    (a === 169 && b === 254) || // link-local, cloud metadata
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

function isPrivateV6(ip: string) {
  const v = ip.toLowerCase();
  if (v === "::" || v === "::1") return true;
  if (v.startsWith("::ffff:")) return isPrivateV4(v.slice(7));
  return v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe8") || v.startsWith("fe9") || v.startsWith("fea") || v.startsWith("feb");
}

export const isPrivateAddress = (ip: string) => (isIP(ip) === 4 ? isPrivateV4(ip) : isPrivateV6(ip));

/** Returns an error message, or null if the URL may receive webhooks. */
export async function checkWebhookUrl(raw: string): Promise<string | null> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return "Enter a valid URL.";
  }
  // Plain http only for local development against a localhost receiver.
  const allowLocal = process.env.NODE_ENV !== "production" && process.env.WEBHOOKS_ALLOW_LOCALHOST === "1";
  if (url.protocol !== "https:" && !(allowLocal && url.protocol === "http:")) return "Webhook URLs must use https://";
  if (url.username || url.password) return "URLs with credentials aren't allowed.";

  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (allowLocal && (host === "localhost" || host === "127.0.0.1")) return null;
  try {
    const addrs = isIP(host) ? [{ address: host }] : await lookup(host, { all: true });
    if (!addrs.length) return "That hostname doesn't resolve.";
    if (addrs.some((a) => isPrivateAddress(a.address))) return "Webhook URLs must point to a public address.";
  } catch {
    return "That hostname doesn't resolve.";
  }
  return null;
}
