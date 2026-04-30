export type FormFieldError = { name: string; message: string };

export type FormActionResult = {
  ok: boolean;
  error?: unknown;
  field_errors?: FormFieldError[];
};

export type FormAction = (
  context: unknown,
  formData: FormData,
  params: URLSearchParams,
) => Promise<FormActionResult | void> | FormActionResult | void;

export const formActionRegistry: Record<string, FormAction> = {};

/**
 * Register a form action triggered by submitting a form with gg-form-action="<id>".
 *
 * Receives the context object passed to init(), a FormData snapshot of the submitted form,
 * and a URLSearchParams snapshot of the current URL query string. Return:
 * - { ok: true } on success
 * - { ok: false, field_errors: [{ name, message }, ...] } for validation errors
 * - { ok: false, error: "..." } for a single form-level error
 * - Both field_errors and error may be present together.
 */
export function registerFormAction(id: string, fn: FormAction): void {
  formActionRegistry[id] = fn;
}
