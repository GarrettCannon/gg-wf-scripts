import { ATTR, SEL } from "./attrs.js";
import { onElement } from "./dom-observer.js";

type QueryChangeCallback = (key: string, value: string | null) => void;

const subscribers: QueryChangeCallback[] = [];

export function getParams(): URLSearchParams {
  return new URLSearchParams(window.location.search);
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
  const setTrigger = target.closest(`[${ATTR.querySet}]`);
  if (setTrigger) {
    const attr = setTrigger.getAttribute(ATTR.querySet) ?? "";
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

  const removeTrigger = target.closest(`[${ATTR.queryRemove}]`);
  if (removeTrigger) {
    const attr = removeTrigger.getAttribute(ATTR.queryRemove) ?? "";
    const keys = attr
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);
    if (keys.length) removeQueryParams(keys);
    return;
  }
}

export function initQueryParams(): () => void {
  const onClick = (e: Event) => {
    handleQueryClick(e.target instanceof Element ? e.target : null);
  };

  const onShadowClick = (e: Event) => {
    const detail = (e as CustomEvent<{ target: Element }>).detail;
    handleQueryClick(detail?.target ?? null);
  };

  document.addEventListener("click", onClick);
  document.addEventListener("gg:shadow:click", onShadowClick);

  const unbindBindings = initQueryBindings();

  return () => {
    document.removeEventListener("click", onClick);
    document.removeEventListener("gg:shadow:click", onShadowClick);
    unbindBindings();
  };
}

// ---- gg-query-bind: input/textarea/select <-> URL param ----

type BindableInput = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

function syncBindInputFromUrl(el: BindableInput): void {
  const key = el.getAttribute(ATTR.queryBind);
  if (!key) return;
  const value = new URL(window.location.href).searchParams.get(key) ?? "";
  if (el.value !== value) el.value = value;
}

const boundInputs = new WeakSet<BindableInput>();

function setupQueryBindInput(el: BindableInput): void {
  if (boundInputs.has(el)) return;
  const key = el.getAttribute(ATTR.queryBind);
  if (!key) return;
  boundInputs.add(el);

  const debounceMs =
    parseInt(el.getAttribute(ATTR.queryDebounce) ?? "0", 10) || 0;

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
  // it into the input without re-firing the input listener. Self-unsubscribe
  // once the input is detached so the subscriber list doesn't grow unbounded
  // across mount/unmount cycles.
  const unsub = onQueryChanged((changedKey, value) => {
    if (!el.isConnected) {
      unsub();
      return;
    }
    if (changedKey !== key) return;
    const next = value ?? "";
    if (el.value === next) return;
    suppress = true;
    el.value = next;
    suppress = false;
  });
}

function initQueryBindings(): () => void {
  const unbind = onElement(SEL.queryBind, (el) => {
    if (
      el instanceof HTMLInputElement ||
      el instanceof HTMLTextAreaElement ||
      el instanceof HTMLSelectElement
    ) {
      setupQueryBindInput(el);
    }
  });

  const onPopstate = () => {
    document
      .querySelectorAll<BindableInput>(SEL.queryBind)
      .forEach(syncBindInputFromUrl);
  };
  window.addEventListener("popstate", onPopstate);

  return () => {
    unbind();
    window.removeEventListener("popstate", onPopstate);
  };
}
