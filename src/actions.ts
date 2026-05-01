export type ActionResult = { ok: boolean; error?: unknown };

export type Action<
  TContext = unknown,
  TData extends Record<string, unknown> = Record<string, unknown>,
> = (
  context: TContext,
  data: TData,
  params: URLSearchParams,
) => Promise<ActionResult | void> | ActionResult | void;
