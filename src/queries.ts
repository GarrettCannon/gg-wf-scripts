export type Query<TContext = unknown, TResult = unknown> = (
  context: TContext,
  params: URLSearchParams,
) => Promise<TResult> | TResult;
