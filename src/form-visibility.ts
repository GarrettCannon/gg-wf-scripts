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

type FieldInput = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

function getFieldValue(
  scope: ParentNode,
  name: string,
): string | null {
  const escaped = CSS.escape(name);
  const inputs = scope.querySelectorAll<FieldInput>(
    `input[name="${escaped}"], select[name="${escaped}"], textarea[name="${escaped}"]`,
  );
  if (!inputs.length) return null;

  const first = inputs[0];
  const type = (first.getAttribute("type") || "").toLowerCase();
  if (type === "radio" || type === "checkbox") {
    for (const input of inputs) {
      if (input instanceof HTMLInputElement && input.checked) return input.value;
    }
    return null;
  }
  return first.value.trim();
}

function matchesAny(scope: ParentNode, conditions: Condition[]): boolean {
  return conditions.some(
    ({ name, value }) => getFieldValue(scope, name) === value,
  );
}

export function initFormVisibility(): void {
  // Group all [gg-visible-when] elements by their nearest scope —
  // either an explicit [gg-form-scope] or a <form>.
  const scopeTargets = new Map<Element, HTMLElement[]>();
  document.querySelectorAll<HTMLElement>("[gg-visible-when]").forEach((el) => {
    if (!Boolean(el.getAttribute("gg-visible-when"))) {
      return;
    }
    const scope = el.closest("[gg-form-scope], form");
    if (!scope) {
      console.warn(
        "[gg-visible-when] element is not inside a <form> or [gg-form-scope]:",
        el,
      );
      return;
    }
    if (!scopeTargets.has(scope)) scopeTargets.set(scope, []);
    scopeTargets.get(scope)!.push(el);
  });

  scopeTargets.forEach((targets, scope) => {
    const conditions = new WeakMap<HTMLElement, Condition[]>();
    const lastState = new WeakMap<HTMLElement, boolean>();
    const hideTimers = new WeakMap<HTMLElement, ReturnType<typeof setTimeout>>();

    targets.forEach((el) => {
      conditions.set(
        el,
        parseConditions(el.getAttribute("gg-visible-when") ?? ""),
      );
      el.style.transition = "none";
      el.style.opacity = "0";
      el.style.display = "none";
      el.style.pointerEvents = "none";
      el.setAttribute("inert", "");
      el.setAttribute("aria-hidden", "true");
      lastState.set(el, false);
    });

    function show(el: HTMLElement): void {
      const pending = hideTimers.get(el);
      if (pending) {
        clearTimeout(pending);
        hideTimers.delete(el);
      }
      el.removeAttribute("inert");
      el.removeAttribute("aria-hidden");
      el.style.display = "";
      el.style.pointerEvents = "";
      requestAnimationFrame(() => {
        el.style.opacity = "1";
      });
    }

    function hide(el: HTMLElement): void {
      el.style.opacity = "0";
      el.style.pointerEvents = "none";
      el.setAttribute("inert", "");
      el.setAttribute("aria-hidden", "true");
      const t = setTimeout(() => {
        el.style.display = "none";
        hideTimers.delete(el);
      }, TRANSITION_MS);
      hideTimers.set(el, t);
    }

    function evaluate(): void {
      targets.forEach((el) => {
        const shouldShow = matchesAny(scope, conditions.get(el) ?? []);
        if (shouldShow === lastState.get(el)) return;
        lastState.set(el, shouldShow);
        if (shouldShow) show(el);
        else hide(el);
      });
    }

    requestAnimationFrame(() => {
      targets.forEach((el) => {
        el.style.transition = `opacity ${TRANSITION_MS}ms ease`;
      });
      evaluate();
    });

    scope.addEventListener("change", evaluate);
    scope.addEventListener("input", evaluate);
  });
}
