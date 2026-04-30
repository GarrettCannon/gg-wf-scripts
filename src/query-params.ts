type QueryChangeCallback = (key: string, value: string | null) => void;

const subscribers: QueryChangeCallback[] = [];

/**
 * Snapshot of the current URL query string as a URLSearchParams instance.
 */
export function getParams(): URLSearchParams {
  return new URL(window.location.href).searchParams;
}

export function onQueryChanged(callback: QueryChangeCallback): () => void {
  subscribers.push(callback);
  return () => {
    const idx = subscribers.indexOf(callback);
    if (idx >= 0) subscribers.splice(idx, 1);
  };
}

function notify(key: string, value: string | null): void {
  subscribers.forEach((cb) => cb(key, value));
}

/**
 * Set one or more URL query params and notify subscribers.
 */
export function setQueryParams(
  params: Array<{ key: string; value: string }>,
): void {
  const url = new URL(window.location.href);
  params.forEach(({ key, value }) => url.searchParams.set(key, value));
  history.pushState({}, "", url);
  params.forEach(({ key, value }) => notify(key, value));
}

/**
 * Remove one or more URL query params and notify subscribers.
 */
export function removeQueryParams(keys: string[]): void {
  const url = new URL(window.location.href);
  keys.forEach((key) => url.searchParams.delete(key));
  history.pushState({}, "", url);
  keys.forEach((key) => notify(key, null));
}

// ---- click delegation for gg-query-set / gg-query-remove ----

function handleQueryClick(target: Element | null): void {
  if (!target) return;
  const setTrigger = target.closest("[gg-query-set]");
  if (setTrigger) {
    const attr = setTrigger.getAttribute("gg-query-set") ?? "";
    const params = attr
      .split(",")
      .filter(Boolean)
      .map((pair) => {
        const [key, value] = pair.split(":");
        return { key: key?.trim() ?? "", value: value?.trim() ?? "" };
      })
      .filter((p) => p.key && p.value);
    if (params.length) setQueryParams(params);
    return;
  }

  const removeTrigger = target.closest("[gg-query-remove]");
  if (removeTrigger) {
    const attr = removeTrigger.getAttribute("gg-query-remove") ?? "";
    const keys = attr
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);
    if (keys.length) removeQueryParams(keys);
    return;
  }
}

export function initQueryParams(): void {
  document.addEventListener("click", (e) => {
    handleQueryClick(e.target instanceof Element ? e.target : null);
  });

  // Shadow-root click forwarder — shadow DOM swallows bubbling, so anything
  // inside a shadow tree dispatches `gg:shadow:click` with the real target.
  document.addEventListener("gg:shadow:click", (e) => {
    const detail = (e as CustomEvent<{ target: Element }>).detail;
    handleQueryClick(detail?.target ?? null);
  });

  initQueryBindings();
}

// ---- gg-query-bind: input/textarea/select <-> URL param ----

type BindableInput = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

function syncBindInputFromUrl(el: BindableInput): void {
  const key = el.getAttribute("gg-query-bind");
  if (!key) return;
  const value = new URL(window.location.href).searchParams.get(key) ?? "";
  if (el.value !== value) el.value = value;
}

function setupQueryBindInput(el: BindableInput): void {
  const key = el.getAttribute("gg-query-bind");
  if (!key) return;
  const debounceMs =
    parseInt(el.getAttribute("gg-query-debounce") ?? "0", 10) || 0;

  syncBindInputFromUrl(el);

  let timer: ReturnType<typeof setTimeout> | undefined;
  let suppress = false;
  el.addEventListener("input", () => {
    if (suppress) return;
    if (timer !== undefined) clearTimeout(timer);
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

function initQueryBindings(): void {
  document
    .querySelectorAll<BindableInput>("[gg-query-bind]")
    .forEach(setupQueryBindInput);

  // Back/forward navigation doesn't fire pushState notifications, so
  // re-sync all bound inputs from the URL on popstate.
  window.addEventListener("popstate", () => {
    document
      .querySelectorAll<BindableInput>("[gg-query-bind]")
      .forEach(syncBindInputFromUrl);
  });
}
