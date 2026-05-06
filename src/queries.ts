export type Query<TContext = unknown, TResult = unknown> = (
  context: TContext,
  params: URLSearchParams,
) => Promise<TResult> | TResult;

export type RegisteredQuery<TContext = unknown> = {
  handler: Query<TContext>;
  on?: string[];
};
