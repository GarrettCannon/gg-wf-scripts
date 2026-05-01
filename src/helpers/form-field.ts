export type FieldInput =
  | HTMLInputElement
  | HTMLSelectElement
  | HTMLTextAreaElement;

/**
 * Find every named input/select/textarea matching `name` within `scope`.
 * Used by the data engine, form-action engine, and form-visibility — anywhere
 * we need to read or write a form field by its `name` attribute.
 */
export function findInputs(scope: ParentNode, name: string): FieldInput[] {
  const escaped = CSS.escape(name);
  return Array.from(
    scope.querySelectorAll<FieldInput>(
      `input[name="${escaped}"], select[name="${escaped}"], textarea[name="${escaped}"]`,
    ),
  );
}

/**
 * Read the current value of a named field. For radio/checkbox groups, returns
 * the value of the checked input (or null if none checked). Returns null when
 * no matching input exists. Trimmed for text-like inputs.
 */
export function readField(scope: ParentNode, name: string): string | null {
  const inputs = findInputs(scope, name);
  if (!inputs.length) return null;

  const first = inputs[0];
  const type = (first.getAttribute("type") || "").toLowerCase();
  if (type === "radio" || type === "checkbox") {
    for (const input of inputs) {
      if (input instanceof HTMLInputElement && input.checked) {
        return input.value;
      }
    }
    return null;
  }
  return first.value.trim();
}

/**
 * Write a value into every input matching `name`, dispatching input/change so
 * downstream listeners (visibility, query-bind) react. Skipped when value is
 * null/undefined, so callers can pass `getPath(record, name)` directly.
 */
export function writeField(
  scope: ParentNode,
  name: string,
  value: unknown,
): void {
  if (value == null) return;
  findInputs(scope, name).forEach((el) => {
    if (el instanceof HTMLInputElement) {
      if (el.type === "checkbox") {
        el.checked = Boolean(value);
      } else if (el.type === "radio") {
        el.checked = String(el.value) === String(value);
      } else {
        el.value = String(value);
      }
    } else {
      el.value = String(value);
    }
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  });
}
