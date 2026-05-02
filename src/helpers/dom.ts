import { getPath } from "./path.js";

/**
 * Set textContent on every [gg-field] descendant of `root` to the value
 * at that field's dot-path on `record`. Null / missing values are left
 * as-is (keeps whatever the markup's default content was).
 */
export function populateFields(root: Element, record: unknown): void {
  root.querySelectorAll<HTMLElement>("[gg-field]").forEach((el) => {
    const path = el.getAttribute("gg-field");
    if (!path) return;
    const value = getPath(record, path);
    if (value != null) el.textContent = String(value);
  });
}

/**
 * Write a normalized switch state onto an element.
 * null / undefined become "" so gg-case="" can serve as the empty/default.
 */
export function setSwitchState(el: Element, value: unknown): void {
  el.setAttribute("gg-switch-state", value == null ? "" : String(value));
}

function splitTrim(value: string, sep: string): string[] {
  return value.split(sep).map((s) => s.trim());
}

function caseMatches(caseAttr: string, state: string): boolean {
  const stateParts = splitTrim(state, ",");
  const caseParts = splitTrim(caseAttr, ",");
  if (caseParts.length !== stateParts.length) return false;
  return caseParts.every((part, i) => {
    const alternatives = splitTrim(part, "|");
    return alternatives.includes(stateParts[i] ?? "");
  });
}

/**
 * Show the [gg-case] child whose value matches the container's current
 * gg-switch-state; hide the rest with display:none.
 *
 * Comma in state/case = positional AND match. Pipe in a case position = OR
 * alternation within that position.
 */
export function applySwitchState(container: Element): void {
  const state = container.getAttribute("gg-switch-state") ?? "";
  Array.from(container.children).forEach((child) => {
    if (!(child instanceof HTMLElement)) return;
    const caseAttr = child.getAttribute("gg-case");
    if (caseAttr == null) return;
    child.style.display = caseMatches(caseAttr, state) ? "" : "none";
  });
}
