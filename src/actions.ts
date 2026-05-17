export type ActionResult = { ok: boolean; error?: unknown };

export type RemoveItemPredicate<
  TRecord extends Record<string, unknown> = Record<string, unknown>,
> = (record: TRecord) => boolean;

export type ActionHelpers<
  TRecord extends Record<string, unknown> = Record<string, unknown>,
> = {
  removeItem: (predicate: RemoveItemPredicate<TRecord>) => void;
};

export type Action<
  TContext = unknown,
  TData extends Record<string, unknown> = Record<string, unknown>,
> = (
  context: TContext,
  data: TData,
  params: URLSearchParams,
  helpers: ActionHelpers<TData>,
) => Promise<ActionResult | void> | ActionResult | void;
