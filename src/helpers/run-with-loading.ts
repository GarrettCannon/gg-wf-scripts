/**
 * Set gg-loading="true" on each element while fn runs, clearing it (in a
 * finally block) when fn resolves or throws. Form controls (button, input)
 * also get native `disabled` toggled.
 */
export async function runWithLoading<T>(
  elements: Iterable<Element>,
  fn: () => Promise<T> | T,
): Promise<T> {
  const targets = [...elements];
  targets.forEach(applyLoading);
  try {
    return await fn();
  } finally {
    targets.forEach(clearLoading);
  }
}

function applyLoading(el: Element): void {
  el.setAttribute("gg-loading", "true");
  if (el instanceof HTMLButtonElement || el instanceof HTMLInputElement) {
    el.disabled = true;
  }
}

function clearLoading(el: Element): void {
  el.removeAttribute("gg-loading");
  if (el instanceof HTMLButtonElement || el instanceof HTMLInputElement) {
    el.disabled = false;
  }
}
