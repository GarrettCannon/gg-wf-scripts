import { ATTR, SEL } from "./attrs.js";
import { readField } from "./helpers/form-field.js";
import { setVisibility } from "./helpers/visibility.js";
import { onElement } from "./dom-observer.js";

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

const bindings = new WeakMap<HTMLElement, { cleanup: () => void }>();

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
  let lastState: boolean | undefined;

  function evaluate(): void {
    const shouldShow = matchesAny(scope!, conditions);
    if (shouldShow === lastState) return;
    lastState = shouldShow;
    setVisibility(el, shouldShow);
  }

  scope.addEventListener("change", evaluate);
  scope.addEventListener("input", evaluate);
  evaluate();

  bindings.set(el, {
    cleanup: () => {
      scope.removeEventListener("change", evaluate);
      scope.removeEventListener("input", evaluate);
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
