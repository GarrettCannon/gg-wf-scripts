import { getPath } from "./path.js";

/**
 * Set textContent on every [gg-field] descendant of `root` to the value
 * at that field's dot-path on `record`. Null / missing values are left
 * as-is (keeps whatever the markup's default content was).
 */
export function populateFields(root, record) {
  root.querySelectorAll("[gg-field]").forEach((el) => {
    const path = el.getAttribute("gg-field");
    const value = getPath(record, path);
    if (value != null) el.textContent = String(value);
  });
}

/**
 * Write a normalized switch state onto an element.
 * null / undefined become "" so gg-case="" can serve as the empty/default.
 */
export function setSwitchState(el, value) {
  el.setAttribute("gg-switch-state", value == null ? "" : String(value));
}

/**
 * Show the [gg-case] child whose value matches the container's current
 * gg-switch-state; hide the rest with display:none.
 */
export function applySwitchState(container) {
  const state = container.getAttribute("gg-switch-state") ?? "";
  Array.from(container.children).forEach((child) => {
    if (!child.hasAttribute("gg-case")) return;
    const match = child.getAttribute("gg-case") === state;
    child.style.display = match ? "" : "none";
  });
}
