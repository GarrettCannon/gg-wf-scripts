const subscribers = [];

export function onQueryChanged(callback) {
  subscribers.push(callback);
  return () => {
    const idx = subscribers.indexOf(callback);
    if (idx >= 0) subscribers.splice(idx, 1);
  };
}

function notify(key, value) {
  subscribers.forEach((cb) => cb(key, value));
}

/**
 * Set one or more URL query params and notify subscribers.
 *
 * @param {Array<{key: string, value: string}>} params - Key/value pairs to set.
 */
export function setQueryParams(params) {
  const url = new URL(window.location);
  params.forEach(({ key, value }) => url.searchParams.set(key, value));
  history.pushState({}, "", url);
  params.forEach(({ key, value }) => notify(key, value));
}

/**
 * Remove one or more URL query params and notify subscribers.
 *
 * @param {string[]} keys - Param keys to remove.
 */
export function removeQueryParams(keys) {
  const url = new URL(window.location);
  keys.forEach((key) => url.searchParams.delete(key));
  history.pushState({}, "", url);
  keys.forEach((key) => notify(key, null));
}

// ---- click delegation for gg-query-set / gg-query-remove ----

function handleQueryClick(target) {
  const setTrigger = target.closest("[gg-query-set]");
  if (setTrigger) {
    const params = setTrigger
      .getAttribute("gg-query-set")
      .split(",")
      .filter(Boolean)
      .map((pair) => {
        const [key, value] = pair.split(":");
        return { key: key?.trim(), value: value?.trim() };
      })
      .filter((p) => p.key && p.value);
    if (params.length) setQueryParams(params);
    return;
  }

  const removeTrigger = target.closest("[gg-query-remove]");
  if (removeTrigger) {
    const keys = removeTrigger
      .getAttribute("gg-query-remove")
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);
    if (keys.length) removeQueryParams(keys);
    return;
  }
}

export function initQueryParams() {
  document.addEventListener("click", (e) => handleQueryClick(e.target));

  // Shadow-root click forwarder — shadow DOM swallows bubbling, so anything
  // inside a shadow tree dispatches `gg:shadow:click` with the real target.
  document.addEventListener("gg:shadow:click", (e) =>
    handleQueryClick(e.detail.target),
  );
}
