import { applySwitchState } from "./helpers/dom.js";

export function initSwitchEngine() {
  // Re-apply whenever gg-switch-state changes on any element.
  new MutationObserver((mutations) => {
    mutations.forEach((m) => {
      if (m.attributeName === "gg-switch-state") {
        applySwitchState(m.target);
      }
    });
  }).observe(document.body, {
    attributes: true,
    attributeFilter: ["gg-switch-state"],
    subtree: true,
  });

  // Apply initial state for any elements that already have gg-switch-state
  // set at load time, so we don't flash all children before the first mutation.
  document
    .querySelectorAll("[gg-switch-state]")
    .forEach(applySwitchState);
}
