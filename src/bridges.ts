import { setSwitchState } from "./helpers/dom.js";
import { onQueryChanged } from "./query-params.js";

export function initBridges(): void {
  // ---- gg-switch-query: URL params → gg-switch-state ----
  // On any URL param change, mirror its value onto matching
  // [gg-switch-query="<key>"] elements' gg-switch-state.
  onQueryChanged((key, value) => {
    document
      .querySelectorAll(`[gg-switch-query="${CSS.escape(key)}"]`)
      .forEach((el) => setSwitchState(el, value));
  });

  // Initial-load pass: read current URL params and set state for every
  // [gg-switch-query] on the page, so we don't flash before the first change.
  const params = new URLSearchParams(window.location.search);
  document.querySelectorAll("[gg-switch-query]").forEach((el) => {
    const key = el.getAttribute("gg-switch-query");
    if (!key) return;
    setSwitchState(el, params.get(key));
  });

  // ---- webflow:emit → Webflow IX ----
  window.addEventListener("load", () => {
    Webflow.push(() => {
      const wfIx = Webflow.require("ix3");
      document.addEventListener("webflow:emit", (e) => {
        const detail = (e as CustomEvent<{ event: string }>).detail;
        if (detail?.event) wfIx.emit(detail.event);
      });
    });
  });
}
