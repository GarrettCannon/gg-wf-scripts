const TRANSITION_MS = 200;

function parseConditions(attr) {
  return attr
    .split(",")
    .map((pair) => {
      const [name, value] = pair.split(":");
      return { name: name?.trim(), value: value?.trim() };
    })
    .filter((p) => p.name && p.value);
}

function getFieldValue(scope, name) {
  const escaped = CSS.escape(name);
  const inputs = scope.querySelectorAll(
    `input[name="${escaped}"], select[name="${escaped}"], textarea[name="${escaped}"]`,
  );
  if (!inputs.length) return null;

  const type = (inputs[0].getAttribute("type") || "").toLowerCase();
  if (type === "radio" || type === "checkbox") {
    for (const input of inputs) {
      if (input.checked) return input.value;
    }
    return null;
  }
  return inputs[0].value.trim();
}

function matchesAny(scope, conditions) {
  return conditions.some(
    ({ name, value }) => getFieldValue(scope, name) === value,
  );
}

export function initFormVisibility() {
  // Group all [gg-visible-when] elements by their nearest scope —
  // either an explicit [gg-form-scope] or a <form>.
  const scopeTargets = new Map();
  document.querySelectorAll("[gg-visible-when]").forEach((el) => {
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
    scopeTargets.get(scope).push(el);
  });

  scopeTargets.forEach((targets, scope) => {
    const conditions = new WeakMap();
    const lastState = new WeakMap();
    const hideTimers = new WeakMap();

    targets.forEach((el) => {
      conditions.set(
        el,
        parseConditions(el.getAttribute("gg-visible-when")),
      );
      el.style.transition = "none";
      el.style.opacity = "0";
      el.style.display = "none";
      el.style.pointerEvents = "none";
      el.setAttribute("inert", "");
      el.setAttribute("aria-hidden", "true");
      lastState.set(el, false);
    });

    function show(el) {
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

    function hide(el) {
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

    function evaluate() {
      targets.forEach((el) => {
        const shouldShow = matchesAny(scope, conditions.get(el));
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
