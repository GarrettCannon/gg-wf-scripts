import type { DataEngineDeps } from "./engine-deps.js";
import { ATTR, SEL } from "./attrs.js";
import { getPath } from "./helpers/path.js";
import {
  populateFields,
  setSwitchState,
  applySwitchState,
} from "./helpers/dom.js";
import { setVisibility } from "./helpers/visibility.js";
import { writeField } from "./helpers/form-field.js";
import { runHandler, type RunHandlerResult } from "./helpers/run-handler.js";
import { onElement } from "./dom-observer.js";
import { onQueryChanged, getParams } from "./query-params.js";

type DataRecord = Record<string, unknown>;

function applySwitchFields(root: Element, record: DataRecord): void {
  root.querySelectorAll(SEL.switchField).forEach((el) => {
    const attr = el.getAttribute(ATTR.switchField);
    if (!attr) return;
    const paths = attr
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    if (!paths.length) return;
    const value =
      paths.length === 1
        ? getPath(record, paths[0]!)
        : paths
            .map((p) => {
              const v = getPath(record, p);
              return v == null ? "" : String(v);
            })
            .join(",");
    setSwitchState(el, value);
    applySwitchState(el, { instant: true });
  });
}

function emitDataReady(container: Element, record: DataRecord): void {
  container.dispatchEvent(
    new CustomEvent("gg-data-ready", { bubbles: true, detail: { record } }),
  );
}

function populateFormFields(root: Element, record: DataRecord): void {
  root
    .querySelectorAll<HTMLElement>("input[name], select[name], textarea[name]")
    .forEach((el) => {
      const name = el.getAttribute("name");
      if (!name) return;
      writeField(root, name, getPath(record, name));
    });
}

function renderListItems(
  container: Element,
  template: Element,
  items: unknown[],
): void {
  if (template instanceof HTMLElement) template.style.display = "none";

  Array.from(container.children).forEach((child) => {
    if (child !== template) child.remove();
  });

  items.forEach((item) => {
    const clone = template.cloneNode(true) as HTMLElement;
    clone.removeAttribute(ATTR.listTemplate);
    const record = (item ?? {}) as DataRecord;
    if (clone instanceof HTMLButtonElement) {
      clone.setAttribute(ATTR.querySet, `modal:view,id:${record.id}`);
    }
    if (record?.id != null) clone.id = String(record.id);
    clone.__ggRecord = record;
    populateFields(clone, record);
    applySwitchFields(clone, record);
    populateFieldLists(clone, record);
    container.appendChild(clone);
    setVisibility(clone, true);
    emitDataReady(clone, record);
  });
}

function populateFieldLists(root: Element, record: DataRecord): void {
  root.querySelectorAll<HTMLElement>(SEL.fieldList).forEach((el) => {
    if (el.closest(SEL.listTemplate)) return;

    const path = el.getAttribute(ATTR.fieldList);
    if (!path) return;
    const value = getPath(record, path);
    if (!Array.isArray(value)) return;

    const template = el.querySelector(SEL.listTemplate);
    if (!template) {
      console.warn(`[gg-field-list] no [${ATTR.listTemplate}] inside "${path}"`);
      return;
    }

    renderListItems(el, template, value);
  });
}

export async function executeQuery<TContext>(
  id: string,
  deps: DataEngineDeps<TContext>,
  container?: Element,
): Promise<RunHandlerResult<unknown>> {
  const params = getParams();
  const fields: Record<string, unknown> = {
    params: Object.fromEntries(params),
  };
  if (container) fields.container = container;

  const registered = deps.queries[id];
  if (!registered) {
    const error = new Error(`no query registered for "${id}"`);
    console.warn(`[gg-data] no query registered for "${id}"`);
    deps.emitError({ prefix: "[gg-data]", id, error, fields });
    return { ok: false, error };
  }

  return runHandler(
    {
      prefix: "[gg-data]",
      id,
      fields,
      debug: deps.debug,
      emitError: deps.emitError,
      loading: container ? [container] : undefined,
    },
    () => registered.handler(deps.context, params),
  );
}

type DataKind = "list" | "form" | "single";

function getDataBinding(
  el: Element,
): { id: string; kind: DataKind } | null {
  for (const [attr, kind] of [
    [ATTR.dataList, "list"],
    [ATTR.dataForm, "form"],
    [ATTR.data, "single"],
  ] as const) {
    const id = el.getAttribute(attr);
    if (id) return { id, kind };
  }
  return null;
}

async function handleQuery<TContext>(
  container: Element,
  deps: DataEngineDeps<TContext>,
): Promise<void> {
  const binding = getDataBinding(container);
  if (!binding) return;
  const { id, kind } = binding;

  const handlerResult = await executeQuery(id, deps, container);
  if (!handlerResult.ok) return;
  const result = handlerResult.value;
  if (result === undefined) return;

  if (kind === "list") {
    if (!Array.isArray(result)) {
      console.warn(`[gg-data-list] query "${id}" did not return an array`);
      return;
    }

    const template = container.querySelector(SEL.listTemplate);
    if (!template) {
      console.warn(`[gg-data-list] no [${ATTR.listTemplate}] inside "${id}"`);
      return;
    }

    renderListItems(container, template, result);
  } else if (kind === "form") {
    if (Array.isArray(result)) {
      console.warn(
        `[gg-data-form] query "${id}" returned an array; expected a single record`,
      );
      return;
    }
    if (!result) return;
    const record = result as DataRecord;
    container.__ggRecord = record;
    populateFormFields(container, record);
    emitDataReady(container, record);
  } else {
    if (Array.isArray(result)) {
      console.warn(
        `[gg-data] query "${id}" returned an array; use gg-data-list instead`,
      );
      return;
    }
    if (!result) return;
    const record = result as DataRecord;
    container.__ggRecord = record;
    populateFields(container, record);
    applySwitchFields(container, record);
    populateFieldLists(container, record);
    emitDataReady(container, record);
  }
}

export function initDataEngine<TContext>(
  deps: DataEngineDeps<TContext>,
): () => void {
  const seen = new WeakSet<Element>();
  const unbind = onElement(SEL.dataAny, (el) => {
    if (seen.has(el)) return;
    seen.add(el);
    handleQuery(el, deps);
  });

  const unsubscribe = onQueryChanged((key) => {
    document.querySelectorAll(SEL.dataAny).forEach((c) => {
      const binding = getDataBinding(c);
      if (!binding) return;
      const attr = c.getAttribute(ATTR.dataOn);
      const keys = attr
        ? attr.split(",").map((s) => s.trim())
        : deps.queries[binding.id]?.on;
      if (!keys?.includes(key)) return;
      handleQuery(c, deps);
    });
  });

  return () => {
    unbind();
    unsubscribe();
  };
}
