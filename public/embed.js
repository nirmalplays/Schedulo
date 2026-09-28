/*!
 * Schedulo embed — add scheduling to any website.
 *
 *   <script src="https://YOUR_APP/embed.js" async></script>
 *
 * Inline:   <div class="schedulo-inline-widget" data-url="https://YOUR_APP/you/30min" style="min-width:320px;height:700px"></div>
 * Popup:    <a href="#" onclick="Schedulo.initPopupWidget({ url: 'https://YOUR_APP/you/30min' }); return false;">Book a call</a>
 * Badge:    Schedulo.initBadgeWidget({ url: '...', text: 'Schedule time with me', color: '#006bff', textColor: '#ffffff' })
 *
 * Events (listen on window "message"): schedulo.profile_page_viewed, schedulo.date_and_time_selected,
 * schedulo.event_scheduled, schedulo.event_rescheduled, schedulo.page_height
 */
(function () {
  if (window.Schedulo && window.Schedulo.__loaded) return;

  var script = document.currentScript || document.querySelector('script[src*="/embed.js"]');
  var ORIGIN = script ? new URL(script.src).origin : location.origin;
  var popup = null;

  function buildUrl(url, opts) {
    var u = new URL(url, ORIGIN);
    u.searchParams.set("embed", "1");
    u.searchParams.set("embed_domain", location.hostname);
    var prefill = (opts && opts.prefill) || {};
    if (prefill.name) u.searchParams.set("name", prefill.name);
    if (prefill.email) u.searchParams.set("email", prefill.email);
    var utm = (opts && opts.utm) || {};
    ["utmSource", "utmMedium", "utmCampaign", "utmContent", "utmTerm"].forEach(function (k) {
      if (utm[k]) u.searchParams.set(k.replace(/[A-Z]/, function (c) { return "_" + c.toLowerCase(); }), utm[k]);
    });
    if (opts && opts.hideEventTypeDetails) u.searchParams.set("hide_event_type_details", "1");
    if (opts && opts.primaryColor) u.searchParams.set("primary_color", String(opts.primaryColor).replace("#", ""));
    return u.toString();
  }

  function makeIframe(src, title) {
    var f = document.createElement("iframe");
    f.src = src;
    f.title = title || "Select a date and time";
    f.setAttribute("frameborder", "0");
    f.setAttribute("allow", "payment");
    f.style.cssText = "width:100%;height:100%;border:0;display:block;";
    return f;
  }

  function spinner(parent) {
    var s = document.createElement("div");
    s.setAttribute("data-schedulo-spinner", "");
    s.style.cssText = "position:absolute;inset:0;display:flex;align-items:center;justify-content:center;";
    s.innerHTML =
      '<div style="width:36px;height:36px;border-radius:50%;border:3px solid #d4e0ed;border-top-color:#006bff;animation:schedulo-spin .8s linear infinite"></div>';
    parent.appendChild(s);
    return s;
  }

  function ensureStyles() {
    if (document.getElementById("schedulo-embed-styles")) return;
    var st = document.createElement("style");
    st.id = "schedulo-embed-styles";
    st.textContent =
      "@keyframes schedulo-spin{to{transform:rotate(360deg)}}" +
      ".schedulo-overlay{position:fixed;inset:0;z-index:2147483000;background:rgba(31,31,31,.4);display:flex;align-items:center;justify-content:center;padding:24px}" +
      ".schedulo-popup{position:relative;width:100%;max-width:1060px;height:min(720px,calc(100vh - 48px));background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 12px 40px rgba(0,0,0,.25)}" +
      ".schedulo-close{position:absolute;top:12px;right:12px;z-index:2;width:36px;height:36px;border-radius:50%;border:0;background:rgba(255,255,255,.9);font:24px/36px sans-serif;color:#0b3558;cursor:pointer}" +
      ".schedulo-badge{position:fixed;right:20px;bottom:15px;z-index:2147482999;border:0;border-radius:25px;padding:0 20px;height:48px;font:600 15px/48px -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;box-shadow:0 2px 12px rgba(0,0,0,.25);cursor:pointer}" +
      "@media (max-width:640px){.schedulo-overlay{padding:0}.schedulo-popup{height:100%;max-width:none;border-radius:0}}";
    document.head.appendChild(st);
  }

  function initInlineWidget(opts) {
    var parent = opts.parentElement;
    if (!parent || !opts.url) return;
    ensureStyles();
    parent.innerHTML = "";
    if (getComputedStyle(parent).position === "static") parent.style.position = "relative";
    if (!parent.style.height) parent.style.minHeight = "700px";
    var sp = spinner(parent);
    var frame = makeIframe(buildUrl(opts.url, opts), opts.title);
    frame.style.minHeight = "700px";
    frame.onload = function () { sp.remove(); };
    frame.setAttribute("data-schedulo-inline", "");
    if (opts.resize !== false) frame.setAttribute("data-schedulo-resize", "");
    parent.appendChild(frame);
  }

  function closePopupWidget() {
    if (!popup) return;
    popup.remove();
    popup = null;
    document.documentElement.style.overflow = "";
  }

  function initPopupWidget(opts) {
    if (!opts || !opts.url) return;
    ensureStyles();
    closePopupWidget();
    var overlay = document.createElement("div");
    overlay.className = "schedulo-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Schedule a meeting");
    var box = document.createElement("div");
    box.className = "schedulo-popup";
    var close = document.createElement("button");
    close.className = "schedulo-close";
    close.setAttribute("aria-label", "Close");
    close.innerHTML = "&times;";
    close.onclick = closePopupWidget;
    var sp = spinner(box);
    var frame = makeIframe(buildUrl(opts.url, opts), opts.title);
    frame.onload = function () { sp.remove(); };
    box.appendChild(close);
    box.appendChild(frame);
    overlay.appendChild(box);
    overlay.addEventListener("click", function (e) { if (e.target === overlay) closePopupWidget(); });
    document.body.appendChild(overlay);
    document.documentElement.style.overflow = "hidden";
    popup = overlay;
    close.focus();
  }

  function initBadgeWidget(opts) {
    if (!opts || !opts.url) return;
    ensureStyles();
    var existing = document.querySelector(".schedulo-badge");
    if (existing) existing.remove();
    var b = document.createElement("button");
    b.type = "button";
    b.className = "schedulo-badge";
    b.textContent = opts.text || "Schedule time with me";
    b.style.background = opts.color || "#006bff";
    b.style.color = opts.textColor || "#ffffff";
    b.onclick = function () { initPopupWidget(opts); };
    document.body.appendChild(b);
  }

  // Messages from our iframes: auto-height for inline widgets.
  window.addEventListener("message", function (e) {
    if (e.origin !== ORIGIN || !e.data || typeof e.data.event !== "string") return;
    if (e.data.event === "schedulo.page_height") {
      var frames = document.querySelectorAll("iframe[data-schedulo-resize]");
      for (var i = 0; i < frames.length; i++) {
        if (frames[i].contentWindow === e.source) frames[i].style.height = Math.max(Number(e.data.payload.height) || 0, 500) + "px";
      }
    }
  });

  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closePopupWidget(); });

  function autoInit() {
    // ".calclone-inline-widget" = snippets pasted before the rename to Schedulo.
    var nodes = document.querySelectorAll(".schedulo-inline-widget[data-url], .calclone-inline-widget[data-url]");
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].getAttribute("data-processed")) continue;
      nodes[i].setAttribute("data-processed", "true");
      initInlineWidget({
        url: nodes[i].getAttribute("data-url"),
        parentElement: nodes[i],
        resize: nodes[i].getAttribute("data-resize") !== "false",
        hideEventTypeDetails: nodes[i].getAttribute("data-hide-event-type-details") === "true",
        primaryColor: nodes[i].getAttribute("data-primary-color") || undefined,
      });
    }
  }

  window.Schedulo = {
    __loaded: true,
    initInlineWidget: initInlineWidget,
    initPopupWidget: initPopupWidget,
    initBadgeWidget: initBadgeWidget,
    closePopupWidget: closePopupWidget,
  };
  window.CalClone = window.Schedulo; // old snippets call CalClone.initPopupWidget(...)
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", autoInit);
  else autoInit();
})();
