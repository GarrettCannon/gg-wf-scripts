export type FormFieldError = { name: string; message: string };

export type FormActionResult = {
  ok: boolean;
  error?: unknown;
  field_errors?: FormFieldError[];
};

export type FormAction<TContext = unknown> = (
  context: TContext,
  formData: FormData,
  params: URLSearchParams,
) => Promise<FormActionResult | void> | FormActionResult | void;
