import { ATTR, SEL } from "./attrs.js";
import { readField } from "./helpers/form-field.js";
import { onElement } from "./dom-observer.js";

const TRANSITION_MS = 200;

type Condition = { name: string; value: string };

function parseConditions(attr: string): Condition[] {
  return attr
    .split(",")
    .map((pair): Condition => {
      const [name, value] = pair.split(":");
      return { name: name?.trim() ?? "", value: value?.trim() ?? "" };
    })
    .filter((p) => p.name && p.value);
}

function matchesAny(scope: ParentNode, conditions: Condition[]): boolean {
  return conditions.some(
    ({ name, value }) => readField(scope, name) === value,
  );
}

type Binding = {
  el: HTMLElement;
  scope: Element;
  conditions: Condition[];
  evaluate: () => void;
  cleanup: () => void;
};

const bindings = new WeakMap<HTMLElement, Binding>();

function setupVisibility(el: HTMLElement): void {
  if (bindings.has(el)) return;

  const attr = el.getAttribute(ATTR.visibleWhen);
  if (!attr) return;

  const scope = el.closest(SEL.formScopeOrForm);
  if (!scope) {
    console.warn(
      `[${ATTR.visibleWhen}] element is not inside a <form> or [${ATTR.formScope}]:`,
      el,
    );
    return;
  }

  const conditions = parseConditions(attr);

  el.style.transition = "none";
  el.style.opacity = "0";
  el.style.display = "none";
  el.style.pointerEvents = "none";
  el.setAttribute("inert", "");
  el.setAttribute("aria-hidden", "true");

  let lastState = false;
  let hideTimer: ReturnType<typeof setTimeout> | undefined;

  function show(): void {
    if (hideTimer !== undefined) {
      clearTimeout(hideTimer);
      hideTimer = undefined;
    }
    el.removeAttribute("inert");
    el.removeAttribute("aria-hidden");
    el.style.display = "";
    el.style.pointerEvents = "";
    requestAnimationFrame(() => {
      el.style.opacity = "1";
    });
  }

  function hide(): void {
    el.style.opacity = "0";
    el.style.pointerEvents = "none";
    el.setAttribute("inert", "");
    el.setAttribute("aria-hidden", "true");
    hideTimer = setTimeout(() => {
      el.style.display = "none";
      hideTimer = undefined;
    }, TRANSITION_MS);
  }

  function evaluate(): void {
    const shouldShow = matchesAny(scope!, conditions);
    if (shouldShow === lastState) return;
    lastState = shouldShow;
    if (shouldShow) show();
    else hide();
  }

  scope.addEventListener("change", evaluate);
  scope.addEventListener("input", evaluate);

  requestAnimationFrame(() => {
    el.style.transition = `opacity ${TRANSITION_MS}ms ease`;
    evaluate();
  });

  bindings.set(el, {
    el,
    scope,
    conditions,
    evaluate,
    cleanup: () => {
      scope.removeEventListener("change", evaluate);
      scope.removeEventListener("input", evaluate);
      if (hideTimer !== undefined) clearTimeout(hideTimer);
    },
  });
}

export function initFormVisibility(): () => void {
  const tracked: HTMLElement[] = [];
  const unbind = onElement(SEL.visibleWhen, (el) => {
    if (!(el instanceof HTMLElement)) return;
    tracked.push(el);
    setupVisibility(el);
  });

  return () => {
    unbind();
    tracked.forEach((el) => {
      const b = bindings.get(el);
      if (b) {
        b.cleanup();
        bindings.delete(el);
      }
    });
  };
}
