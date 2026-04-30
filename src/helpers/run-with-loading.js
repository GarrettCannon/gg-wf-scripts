/**
 * Set gg-loading="true" on each element while fn runs, clearing it (in a
 * finally block) when fn resolves or throws. Form controls (button, input)
 * also get native `disabled` toggled.
 *
 * @param {Iterable<Element>} elements - Elements to mark as loading.
 * @param {() => Promise<T>} fn - The work to run.
 * @returns {Promise<T>}
 * @template T
 */
export async function runWithLoading(elements, fn) {
  const targets = [...elements];
  targets.forEach(applyLoading);
  try {
    return await fn();
  } finally {
    targets.forEach(clearLoading);
  }
}

function applyLoading(el) {
  el.setAttribute("gg-loading", "true");
  if (el instanceof HTMLButtonElement || el instanceof HTMLInputElement) {
    el.disabled = true;
  }
}

function clearLoading(el) {
  el.removeAttribute("gg-loading");
  if (el instanceof HTMLButtonElement || el instanceof HTMLInputElement) {
    el.disabled = false;
  }
}
