export const formActionRegistry = {};

/**
 * Register a form action triggered by submitting a form with gg-form-action="<id>".
 *
 * @param {string} id - The form action identifier, referenced by gg-form-action="<id>" on a form.
 * @param {(context: object, formData: FormData, params: URLSearchParams) => Promise<{
 *   ok: boolean,
 *   error?: any,
 *   field_errors?: Array<{ name: string, message: string }>,
 * }>} fn
 *   Receives the context object passed to init(), a FormData snapshot of the submitted form,
 *   and a URLSearchParams snapshot of the current URL query string. Return:
 *   - { ok: true } on success
 *   - { ok: false, field_errors: [{ name, message }, ...] } for validation errors
 *   - { ok: false, error: "..." } for a single form-level error
 *   - Both field_errors and error may be present together.
 */
export function registerFormAction(id, fn) {
  formActionRegistry[id] = fn;
}
