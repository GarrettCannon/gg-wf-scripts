import { formActionRegistry, type FormFieldError } from "./form-actions.js";
import { populateFields } from "./helpers/dom.js";
import { runHandler } from "./helpers/run-handler.js";
import { runWithLoading } from "./helpers/run-with-loading.js";
import { getParams } from "./query-params.js";

type FormFieldEl =
  | HTMLInputElement
  | HTMLSelectElement
  | HTMLTextAreaElement;

function findInputs(form: HTMLFormElement, name: string): NodeListOf<FormFieldEl> {
  const escaped = CSS.escape(name);
  return form.querySelectorAll<FormFieldEl>(
    `input[name="${escaped}"], select[name="${escaped}"], textarea[name="${escaped}"]`,
  );
}

function clearFieldError(form: HTMLFormElement, name: string): void {
  findInputs(form, name).forEach((el) => {
    el.removeAttribute("gg-form-field-invalid");
  });
  const escaped = CSS.escape(name);
  form
    .querySelectorAll(`[gg-form-field-error="${escaped}"]`)
    .forEach((el) => {
      el.textContent = "";
    });
}

function clearFormErrors(form: HTMLFormElement): void {
  form.querySelectorAll("[gg-form-field-invalid]").forEach((el) => {
    el.removeAttribute("gg-form-field-invalid");
  });
  form.querySelectorAll("[gg-form-field-error]").forEach((el) => {
    el.textContent = "";
  });
  form.querySelectorAll("[gg-form-error]").forEach((el) => {
    el.textContent = "";
  });
  form.querySelectorAll("[gg-form-error-list]").forEach((list) => {
    const template = list.querySelector("[gg-list-template]");
    Array.from(list.children).forEach((child) => {
      if (child !== template) child.remove();
    });
  });
}

function applyFieldErrors(
  form: HTMLFormElement,
  fieldErrors: FormFieldError[],
): void {
  fieldErrors.forEach(({ name, message }) => {
    if (!name) return;
    findInputs(form, name).forEach((el) => {
      el.setAttribute("gg-form-field-invalid", "true");
    });
    const escaped = CSS.escape(name);
    form
      .querySelectorAll(`[gg-form-field-error="${escaped}"]`)
      .forEach((el) => {
        el.textContent = message ?? "";
      });
  });
}

function applyErrorList(
  form: HTMLFormElement,
  fieldErrors: FormFieldError[],
): void {
  form.querySelectorAll("[gg-form-error-list]").forEach((list) => {
    const template = list.querySelector("[gg-list-template]");
    if (!template) {
      console.warn(
        "[gg-form-error-list] no [gg-list-template] inside list:",
        list,
      );
      return;
    }
    fieldErrors.forEach((record) => {
      const clone = template.cloneNode(true) as HTMLElement;
      clone.removeAttribute("gg-list-template");
      clone.style.display = "";
      populateFields(clone, record as unknown as Record<string, unknown>);
      list.appendChild(clone);
    });
  });
}

function applyFormError(form: HTMLFormElement, error: unknown): void {
  if (error == null) return;
  const message = typeof error === "string" ? error : String(error);
  form.querySelectorAll("[gg-form-error]").forEach((el) => {
    el.textContent = message;
  });
}

function bindFieldClearOnInput(form: HTMLFormElement): void {
  if (form.__ggFormErrorBound) return;
  form.__ggFormErrorBound = true;
  form.addEventListener("input", (e) => {
    const target = e.target;
    if (!(target instanceof Element)) return;
    const name = target.getAttribute("name");
    if (!name) return;
    if (target.hasAttribute("gg-form-field-invalid")) {
      clearFieldError(form, name);
    }
  });
}

export function initFormActionEngine(
  context: unknown,
  { debug = false }: { debug?: boolean } = {},
): void {
  async function handleSubmit(
    form: HTMLFormElement,
    event: Event,
  ): Promise<void> {
    const id = form.getAttribute("gg-form-action");
    if (!id) return;
    const action = formActionRegistry[id];
    if (!action) {
      console.warn(`[gg-form-action] no form action registered for "${id}"`);
      return;
    }

    event.preventDefault();
    if (form.hasAttribute("gg-loading")) return;

    if (form.hasAttribute("gg-confirm")) {
      const text = form.getAttribute("gg-confirm-text") || "Are you sure?";
      if (!window.confirm(text)) return;
    }

    clearFormErrors(form);

    const formData = new FormData(form);
    const params = getParams();

    const submitControls = form.querySelectorAll<HTMLElement>(
      'button[type="submit"], button:not([type]), input[type="submit"]',
    );

    const handlerResult = await runWithLoading([form, ...submitControls], () =>
      runHandler(
        {
          prefix: "[gg-form-action]",
          id,
          fields: {
            form,
            formData: Object.fromEntries(formData),
            params: Object.fromEntries(params),
          },
          debug,
        },
        () => action(context, formData, params),
      ),
    );

    if (!handlerResult.ok) {
      applyFormError(form, "Something went wrong. Please try again.");
      return;
    }

    const result = handlerResult.value;
    if (result && (result as { ok?: boolean }).ok === false) {
      const failure = result as {
        error?: unknown;
        field_errors?: FormFieldError[];
      };
      const fieldErrors = Array.isArray(failure.field_errors)
        ? failure.field_errors
        : [];
      applyFieldErrors(form, fieldErrors);
      applyErrorList(form, fieldErrors);
      applyFormError(form, failure.error);
      if (!fieldErrors.length && failure.error == null) {
        console.warn(
          `[gg-form-action] "${id}" returned ok:false with no error or field_errors`,
        );
      }
    }
  }

  document
    .querySelectorAll<HTMLFormElement>("form[gg-form-action]")
    .forEach(bindFieldClearOnInput);

  document.addEventListener("submit", (e) => {
    const form = e.target;
    if (
      form instanceof HTMLFormElement &&
      form.hasAttribute("gg-form-action")
    ) {
      bindFieldClearOnInput(form);
      handleSubmit(form, e);
    }
  });
}
