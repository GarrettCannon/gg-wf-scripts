import { ATTR, SEL } from "./attrs.js";
import { onElement } from "./dom-observer.js";
import { setVisibility } from "./helpers/visibility.js";

function isMatch(elValue: string, bodyValue: string): boolean {
  return elValue
    .split(",")
    .map((v) => v.trim())
    .includes(bodyValue);
}

function applyVisibility(el: Element, attr: string): void {
  if (!(el instanceof HTMLElement)) return;
  if (el === document.body) return;
  const elValue = el.getAttribute(attr);
  if (elValue == null || elValue.trim() === "") return;
  const bodyValue = document.body.getAttribute(attr) ?? "";
  setVisibility(el, isMatch(elValue, bodyValue));
}

function applyAll(attr: string): void {
  document
    .querySelectorAll(`[${attr}]`)
    .forEach((el) => applyVisibility(el, attr));
}

/**
 * Toggle display:none on [gg-auth] and [gg-role] elements based on the
 * matching attribute on <body> (set by initAuth). Comma-separated values on
 * an element act as OR alternatives: gg-role="admin,editor".
 */
export function initAuthEngine(): () => void {
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.target !== document.body) continue;
      if (m.attributeName === ATTR.auth) applyAll(ATTR.auth);
      else if (m.attributeName === ATTR.role) applyAll(ATTR.role);
    }
  });
  observer.observe(document.body, {
    attributes: true,
    attributeFilter: [ATTR.auth, ATTR.role],
  });

  const unbindAuth = onElement(SEL.auth, (el) =>
    applyVisibility(el, ATTR.auth),
  );
  const unbindRole = onElement(SEL.role, (el) =>
    applyVisibility(el, ATTR.role),
  );

  return () => {
    observer.disconnect();
    unbindAuth();
    unbindRole();
  };
}
