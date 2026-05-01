import { ATTR, SEL } from "./attrs.js";
import { applySwitchState } from "./helpers/dom.js";
import { onElement } from "./dom-observer.js";

export function initSwitchEngine(): () => void {
  // Re-apply whenever gg-switch-state changes on any element.
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((m) => {
      if (
        m.attributeName === ATTR.switchState &&
        m.target instanceof Element
      ) {
        applySwitchState(m.target);
      }
    });
  });
  observer.observe(document.body, {
    attributes: true,
    attributeFilter: [ATTR.switchState],
    subtree: true,
  });

  // Initial pass for elements present at start AND any inserted later — the
  // mutation observer above only fires on attribute *changes*, so freshly
  // inserted nodes need an explicit apply.
  const unbind = onElement(SEL.switchState, applySwitchState);

  return () => {
    observer.disconnect();
    unbind();
  };
}
