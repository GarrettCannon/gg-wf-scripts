import type { FormFieldError } from "./form-actions.js";
import type { FormActionEngineDeps } from "./engine-deps.js";
import { ATTR, SEL } from "./attrs.js";
import { populateFields, querySelectorAllDeep } from "./helpers/dom.js";
import { findInputsDeep } from "./helpers/form-field.js";
import { runHandler } from "./helpers/run-handler.js";
import { onElement } from "./dom-observer.js";
import { getParams } from "./query-params.js";

function clearFieldError(form: HTMLFormElement, name: string): void {
  findInputsDeep(form, name).forEach((el) => {
    el.removeAttribute(ATTR.formFieldInvalid);
  });
  const escaped = CSS.escape(name);
  querySelectorAllDeep(
    form,
    `[${ATTR.formFieldError}="${escaped}"]`,
  ).forEach((el) => {
    el.textContent = "";
  });
}

function clearFormErrors(form: HTMLFormElement): void {
  form.removeAttribute(ATTR.formHasError);
  querySelectorAllDeep(form, SEL.formFieldInvalid).forEach((el) => {
    el.removeAttribute(ATTR.formFieldInvalid);
  });
  querySelectorAllDeep(form, SEL.formFieldError).forEach((el) => {
    el.textContent = "";
  });
  querySelectorAllDeep(form, SEL.formError).forEach((el) => {
    el.textContent = "";
  });
  querySelectorAllDeep(form, SEL.formErrorList).forEach((list) => {
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
    findInputsDeep(form, name).forEach((el) => {
      el.setAttribute(ATTR.formFieldInvalid, "true");
    });
    const escaped = CSS.escape(name);
    querySelectorAllDeep(
      form,
      `[${ATTR.formFieldError}="${escaped}"]`,
    ).forEach((el) => {
      el.textContent = message ?? "";
    });
  });
}

function applyErrorList(
  form: HTMLFormElement,
  fieldErrors: FormFieldError[],
): void {
  querySelectorAllDeep(form, SEL.formErrorList).forEach((list) => {
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
  querySelectorAllDeep(form, SEL.formError).forEach((el) => {
    el.textContent = message;
  });
}

function formDataToObject(
  formData: FormData,
): Record<string, FormDataEntryValue | FormDataEntryValue[]> {
  const out: Record<string, FormDataEntryValue | FormDataEntryValue[]> = {};
  for (const [key, value] of formData) {
    if (key in out) {
      const existing = out[key];
      if (Array.isArray(existing)) existing.push(value);
      else out[key] = [existing as FormDataEntryValue, value];
    } else {
      out[key] = value;
    }
  }
  return out;
}

function resetField(
  field: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
): void {
  if (field instanceof HTMLInputElement) {
    if (field.type === "checkbox" || field.type === "radio") {
      field.checked = field.defaultChecked;
    } else if (field.type === "file") {
      field.value = "";
    } else {
      field.value = field.defaultValue;
    }
  } else if (field instanceof HTMLSelectElement) {
    Array.from(field.options).forEach((opt) => {
      opt.selected = opt.defaultSelected;
    });
  } else {
    field.value = field.defaultValue;
  }
  field.dispatchEvent(new Event("input", { bubbles: true }));
  field.dispatchEvent(new Event("change", { bubbles: true }));
}

function resetFormFields(form: HTMLFormElement): void {
  form
    .querySelectorAll<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >("input[name], select[name], textarea[name]")
    .forEach(resetField);
  const visitShadow = (root: ParentNode): void => {
    root.querySelectorAll<HTMLElement>("*").forEach((el) => {
      if (!el.shadowRoot) return;
      el.shadowRoot
        .querySelectorAll<
          HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
        >("input[name], select[name], textarea[name]")
        .forEach(resetField);
      visitShadow(el.shadowRoot);
    });
  };
  visitShadow(form);
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
    const target = e.composedPath()[0];
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
  const loadingState = form.getAttribute(ATTR.loading);
  if (loadingState === "loading" || loadingState === "refreshing") return;

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
        formData: formDataToObject(formData),
        params: Object.fromEntries(params),
      },
      debug: deps.debug,
      emitError: deps.emitError,
      loading: [form, ...submitControls],
    },
    () => action(deps.context, formData, params),
  );

  if (!handlerResult.ok) {
    form.setAttribute(ATTR.formHasError, "true");
    applyFormError(form, "Something went wrong. Please try again.");
    return;
  }

  const result = handlerResult.value as
    | { ok?: boolean; error?: unknown; field_errors?: FormFieldError[]; reset?: boolean }
    | void;
  if (result && result.ok === false) {
    const fieldErrors = Array.isArray(result.field_errors)
      ? result.field_errors
      : [];
    form.setAttribute(ATTR.formHasError, "true");
    applyFieldErrors(form, fieldErrors);
    applyErrorList(form, fieldErrors);
    applyFormError(form, result.error);
    if (!fieldErrors.length && result.error == null) {
      console.warn(
        `[gg-form-action] "${id}" returned ok:false with no error or field_errors`,
      );
    }
    deps.emitError({
      prefix: "[gg-form-action]",
      id,
      error: result.error ?? "validation",
      fields: { form, fieldErrors },
    });
    return;
  }

  if (!result || result.reset !== false) {
    resetFormFields(form);
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
