import { formActionRegistry } from "./form-actions.js";
import { populateFields } from "./helpers/dom.js";
import { runHandler } from "./helpers/run-handler.js";
import { runWithLoading } from "./helpers/run-with-loading.js";
import { getParams } from "./query-params.js";

function findInputs(form, name) {
  const escaped = CSS.escape(name);
  return form.querySelectorAll(
    `input[name="${escaped}"], select[name="${escaped}"], textarea[name="${escaped}"]`,
  );
}

function clearFieldError(form, name) {
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

function clearFormErrors(form) {
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

function applyFieldErrors(form, fieldErrors) {
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

function applyErrorList(form, fieldErrors) {
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
      const clone = template.cloneNode(true);
      clone.removeAttribute("gg-list-template");
      clone.style.display = "";
      populateFields(clone, record);
      list.appendChild(clone);
    });
  });
}

function applyFormError(form, error) {
  if (error == null) return;
  const message = typeof error === "string" ? error : String(error);
  form.querySelectorAll("[gg-form-error]").forEach((el) => {
    el.textContent = message;
  });
}

function bindFieldClearOnInput(form) {
  if (form.__ggFormErrorBound) return;
  form.__ggFormErrorBound = true;
  form.addEventListener("input", (e) => {
    const name = e.target?.getAttribute?.("name");
    if (!name) return;
    if (e.target.hasAttribute("gg-form-field-invalid")) {
      clearFieldError(form, name);
    }
  });
}

export function initFormActionEngine(context, { debug = false } = {}) {
  async function handleSubmit(form, event) {
    const id = form.getAttribute("gg-form-action");
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

    const submitControls = form.querySelectorAll(
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
    if (result?.ok === false) {
      const fieldErrors = Array.isArray(result.field_errors)
        ? result.field_errors
        : [];
      applyFieldErrors(form, fieldErrors);
      applyErrorList(form, fieldErrors);
      applyFormError(form, result.error);
      if (!fieldErrors.length && result.error == null) {
        console.warn(
          `[gg-form-action] "${id}" returned ok:false with no error or field_errors`,
        );
      }
    }
  }

  document.querySelectorAll("form[gg-form-action]").forEach(bindFieldClearOnInput);

  document.addEventListener("submit", (e) => {
    const form = e.target;
    if (form?.tagName === "FORM" && form.hasAttribute("gg-form-action")) {
      bindFieldClearOnInput(form);
      handleSubmit(form, e);
    }
  });
}
