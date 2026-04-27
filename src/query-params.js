const subscribers = [];

/**
 * Snapshot of the current URL query string as a URLSearchParams instance.
 */
export function getParams() {
  return new URL(window.location).searchParams;
}

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

  initQueryBindings();
}

// ---- gg-query-bind: input/textarea/select <-> URL param ----

function syncBindInputFromUrl(el) {
  const key = el.getAttribute("gg-query-bind");
  if (!key) return;
  const value = new URL(window.location).searchParams.get(key) ?? "";
  if (el.value !== value) el.value = value;
}

function setupQueryBindInput(el) {
  const key = el.getAttribute("gg-query-bind");
  if (!key) return;
  const debounceMs = parseInt(el.getAttribute("gg-query-debounce") ?? "0", 10) || 0;

  syncBindInputFromUrl(el);

  let timer;
  let suppress = false;
  el.addEventListener("input", () => {
    if (suppress) return;
    clearTimeout(timer);
    const fire = () => {
      const value = el.value;
      if (value === "") {
        removeQueryParams([key]);
      } else {
        setQueryParams([{ key, value }]);
      }
    };
    if (debounceMs > 0) {
      timer = setTimeout(fire, debounceMs);
    } else {
      fire();
    }
  });

  // When the URL changes from elsewhere (back button, programmatic), mirror
  // it into the input without re-firing the input listener.
  onQueryChanged((changedKey, value) => {
    if (changedKey !== key) return;
    const next = value ?? "";
    if (el.value === next) return;
    suppress = true;
    el.value = next;
    suppress = false;
  });
}

function initQueryBindings() {
  document.querySelectorAll("[gg-query-bind]").forEach(setupQueryBindInput);

  // Back/forward navigation doesn't fire pushState notifications, so
  // re-sync all bound inputs from the URL on popstate.
  window.addEventListener("popstate", () => {
    document.querySelectorAll("[gg-query-bind]").forEach(syncBindInputFromUrl);
  });
}
