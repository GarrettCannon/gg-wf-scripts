import { ATTR, SEL } from "./attrs.js";
import { setSwitchState } from "./helpers/dom.js";
import { onQueryChanged } from "./query-params.js";
import { onElement } from "./dom-observer.js";

function parseKeys(attr: string | null): string[] {
  return (attr ?? "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
}

function joinParamValues(keys: string[], params: URLSearchParams): string {
  return keys.map((k) => params.get(k) ?? "").join(",");
}

export function initBridges(): () => void {
  // ---- gg-switch-query: URL params → gg-switch-state ----
  // Multi-key form: gg-switch-query="sortBy,sortDir" reads both params and
  // joins them positionally into the state (matched by gg-case="date,asc").
  const unsubscribeQuery = onQueryChanged((key) => {
    const params = new URLSearchParams(window.location.search);
    document.querySelectorAll(SEL.switchQuery).forEach((el) => {
      const keys = parseKeys(el.getAttribute(ATTR.switchQuery));
      if (!keys.includes(key)) return;
      setSwitchState(el, joinParamValues(keys, params));
    });
  });

  // Apply current URL state to every [gg-switch-query] element on the page,
  // including any inserted later via Webflow IX or CMS templates.
  const unbindSwitch = onElement(SEL.switchQuery, (el) => {
    const keys = parseKeys(el.getAttribute(ATTR.switchQuery));
    if (!keys.length) return;
    const params = new URLSearchParams(window.location.search);
    setSwitchState(el, joinParamValues(keys, params));
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
