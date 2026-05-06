import type { FormFieldError } from "./form-actions.js";
import type { FormActionEngineDeps } from "./engine-deps.js";
import { ATTR, SEL } from "./attrs.js";
import { populateFields } from "./helpers/dom.js";
import { findInputs } from "./helpers/form-field.js";
import { runHandler } from "./helpers/run-handler.js";
import { onElement } from "./dom-observer.js";
import { getParams } from "./query-params.js";

function clearFieldError(form: HTMLFormElement, name: string): void {
  findInputs(form, name).forEach((el) => {
    el.removeAttribute(ATTR.formFieldInvalid);
  });
  const escaped = CSS.escape(name);
  form
    .querySelectorAll(`[${ATTR.formFieldError}="${escaped}"]`)
    .forEach((el) => {
      el.textContent = "";
    });
}

function clearFormErrors(form: HTMLFormElement): void {
  form.querySelectorAll(SEL.formFieldInvalid).forEach((el) => {
    el.removeAttribute(ATTR.formFieldInvalid);
  });
  form.querySelectorAll(SEL.formFieldError).forEach((el) => {
    el.textContent = "";
  });
  form.querySelectorAll(SEL.formError).forEach((el) => {
    el.textContent = "";
  });
  form.querySelectorAll(SEL.formErrorList).forEach((list) => {
    const template = list.querySelector(SEL.listTemplate);
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
      el.setAttribute(ATTR.formFieldInvalid, "true");
    });
    const escaped = CSS.escape(name);
    form
      .querySelectorAll(`[${ATTR.formFieldError}="${escaped}"]`)
      .forEach((el) => {
        el.textContent = message ?? "";
      });
  });
}

function applyErrorList(
  form: HTMLFormElement,
  fieldErrors: FormFieldError[],
): void {
  form.querySelectorAll(SEL.formErrorList).forEach((list) => {
    const template = list.querySelector(SEL.listTemplate);
    if (!template) {
      console.warn(
        `[${ATTR.formErrorList}] no [${ATTR.listTemplate}] inside list:`,
        list,
      );
      return;
    }
    fieldErrors.forEach((record) => {
      const clone = template.cloneNode(true) as HTMLElement;
      clone.removeAttribute(ATTR.listTemplate);
      clone.style.display = "";
      populateFields(clone, record as unknown as Record<string, unknown>);
      list.appendChild(clone);
    });
  });
}

function applyFormError(form: HTMLFormElement, error: unknown): void {
  if (error == null) return;
  const message = typeof error === "string" ? error : String(error);
  form.querySelectorAll(SEL.formError).forEach((el) => {
    el.textContent = message;
  });
}

function collectShadowFields(root: ParentNode, formData: FormData): void {
  root.querySelectorAll<HTMLElement>("*").forEach((el) => {
    if (!el.shadowRoot) return;
    el.shadowRoot
      .querySelectorAll<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >("input[name], select[name], textarea[name]")
      .forEach((field) => {
        if (
          field instanceof HTMLInputElement &&
          (field.type === "checkbox" || field.type === "radio") &&
          !field.checked
        ) {
          return;
        }
        if (field instanceof HTMLInputElement && field.type === "file") {
          for (const file of field.files ?? []) {
            formData.append(field.name, file);
          }
          return;
        }
        if (field instanceof HTMLSelectElement && field.multiple) {
          Array.from(field.selectedOptions).forEach((opt) => {
            formData.append(field.name, opt.value);
          });
          return;
        }
        formData.append(field.name, field.value);
      });
    collectShadowFields(el.shadowRoot, formData);
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
    if (target.hasAttribute(ATTR.formFieldInvalid)) {
      clearFieldError(form, name);
    }
  });
}

async function handleSubmit<TContext>(
  form: HTMLFormElement,
  event: Event,
  deps: FormActionEngineDeps<TContext>,
): Promise<void> {
  const id = form.getAttribute(ATTR.formAction);
  if (!id) return;
  const action = deps.formActions[id];
  if (!action) {
    console.warn(`[gg-form-action] no form action registered for "${id}"`);
    deps.emitError({
      prefix: "[gg-form-action]",
      id,
      error: "no form action registered",
      fields: { form },
    });
    return;
  }

  event.preventDefault();
  if (form.hasAttribute(ATTR.loading)) return;

  if (form.hasAttribute(ATTR.confirm)) {
    const text = form.getAttribute(ATTR.confirmText) || "Are you sure?";
    if (!window.confirm(text)) return;
  }

  clearFormErrors(form);

  const formData = new FormData(form);
  collectShadowFields(form, formData);
  const params = getParams();

  const submitControls = form.querySelectorAll<HTMLElement>(
    'button[type="submit"], button:not([type]), input[type="submit"]',
  );

  const handlerResult = await runHandler(
    {
      prefix: "[gg-form-action]",
      id,
      fields: {
        form,
        formData: Object.fromEntries(formData),
        params: Object.fromEntries(params),
      },
      debug: deps.debug,
      emitError: deps.emitError,
      loading: [form, ...submitControls],
    },
    () => action(deps.context, formData, params),
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
    deps.emitError({
      prefix: "[gg-form-action]",
      id,
      error: failure.error ?? "validation",
      fields: { form, fieldErrors },
    });
  }
}

export function initFormActionEngine<TContext>(
  deps: FormActionEngineDeps<TContext>,
): () => void {
  const unbind = onElement(SEL.formAction, (el) => {
    if (el instanceof HTMLFormElement) bindFieldClearOnInput(el);
  });

  const onSubmit = (e: Event) => {
    const form = e.target;
    if (
      form instanceof HTMLFormElement &&
      form.hasAttribute(ATTR.formAction)
    ) {
      bindFieldClearOnInput(form);
      handleSubmit(form, e, deps);
    }
  };

  document.addEventListener("submit", onSubmit);

  return () => {
    unbind();
    document.removeEventListener("submit", onSubmit);
  };
}
