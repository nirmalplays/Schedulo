"use client";

import { useEffect } from "react";

/**
 * Inside an embed iframe: reports the page height (so embed.js can size the
 * iframe) and emits a "viewed" event to the host page.
 */
export function EmbedBridge({ viewedEvent }: { viewedEvent?: string }) {
  useEffect(() => {
    if (window.parent === window) return;
    const post = (event: string, payload: Record<string, unknown>) => window.parent.postMessage({ event: `schedulo.${event}`, payload }, "*");
    if (viewedEvent) post(viewedEvent, {});
    let last = 0;
    const report = () => {
      const height = Math.ceil(document.documentElement.scrollHeight);
      if (height !== last) post("page_height", { height: (last = height) });
    };
    report();
    const ro = new ResizeObserver(report);
    ro.observe(document.body);
    return () => ro.disconnect();
  }, [viewedEvent]);
  return null;
}
