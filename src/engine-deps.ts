import type { GgErrorEvent } from "./errors.js";
import type { Query } from "./queries.js";
import type { Action } from "./actions.js";
import type { FormAction } from "./form-actions.js";

/**
 * The minimum surface every engine needs. Engines should depend on this (or a
 * superset) instead of the full `App<TContext>` so they're easier to test and
 * the dependency graph stays explicit.
 */
export type EngineCore<TContext> = {
  context: TContext;
  debug: boolean;
  emitError: (event: GgErrorEvent) => void;
};

export type DataEngineDeps<TContext> = EngineCore<TContext> & {
  queries: Record<string, Query<TContext>>;
};

export type ActionEngineDeps<TContext> = EngineCore<TContext> & {
  actions: Record<string, Action<TContext>>;
};

export type FormActionEngineDeps<TContext> = EngineCore<TContext> & {
  formActions: Record<string, FormAction<TContext>>;
};
