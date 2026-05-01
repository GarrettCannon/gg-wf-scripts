import { ATTR, SEL } from "./attrs.js";
import { setSwitchState } from "./helpers/dom.js";
import { onQueryChanged } from "./query-params.js";
import { onElement } from "./dom-observer.js";

export function initBridges(): () => void {
  // ---- gg-switch-query: URL params → gg-switch-state ----
  const unsubscribeQuery = onQueryChanged((key, value) => {
    document
      .querySelectorAll(`[${ATTR.switchQuery}="${CSS.escape(key)}"]`)
      .forEach((el) => setSwitchState(el, value));
  });

  // Apply current URL state to every [gg-switch-query] element on the page,
  // including any inserted later via Webflow IX or CMS templates.
  const unbindSwitch = onElement(SEL.switchQuery, (el) => {
    const key = el.getAttribute(ATTR.switchQuery);
    if (!key) return;
    const params = new URLSearchParams(window.location.search);
    setSwitchState(el, params.get(key));
  });

  // ---- webflow:emit → Webflow IX ----
  let wfHandler: ((e: Event) => void) | null = null;
  const onLoad = () => {
    Webflow.push(() => {
      const wfIx = Webflow.require("ix3");
      wfHandler = (e: Event) => {
        const detail = (e as CustomEvent<{ event: string }>).detail;
        if (detail?.event) wfIx.emit(detail.event);
      };
      document.addEventListener("webflow:emit", wfHandler);
    });
  };
  window.addEventListener("load", onLoad);

  return () => {
    unsubscribeQuery();
    unbindSwitch();
    window.removeEventListener("load", onLoad);
    if (wfHandler) document.removeEventListener("webflow:emit", wfHandler);
  };
}
