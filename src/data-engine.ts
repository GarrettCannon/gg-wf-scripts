import type { DataEngineDeps } from "./engine-deps.js";
import { ATTR, SEL } from "./attrs.js";
import { getPath } from "./helpers/path.js";
import {
  populateFields,
  setSwitchState,
  applySwitchState,
} from "./helpers/dom.js";
import { writeField } from "./helpers/form-field.js";
import { runHandler } from "./helpers/run-handler.js";
import { runWithLoading } from "./helpers/run-with-loading.js";
import { onElement } from "./dom-observer.js";
import { onQueryChanged, getParams } from "./query-params.js";

type DataRecord = Record<string, unknown>;

function applySwitchFields(root: Element, record: DataRecord): void {
  root.querySelectorAll(SEL.switchField).forEach((el) => {
    const path = el.getAttribute(ATTR.switchField);
    if (!path) return;
    const value = getPath(record, path);
    setSwitchState(el, value);
    applySwitchState(el);
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

async function runQuery<TContext>(
  container: Element,
  deps: DataEngineDeps<TContext>,
): Promise<void> {
  const isList = container.hasAttribute(ATTR.dataList);
  const isForm = container.hasAttribute(ATTR.dataForm);
  const id = container.getAttribute(
    isList ? ATTR.dataList : isForm ? ATTR.dataForm : ATTR.data,
  );
  if (!id) return;
  const query = deps.queries[id];
  if (!query) {
    console.warn(`[gg-data] no query registered for "${id}"`);
    deps.emitError({
      prefix: "[gg-data]",
      id,
      error: "no query registered",
      fields: { container },
    });
    return;
  }

  const params = getParams();
  const handlerResult = await runWithLoading([container], () =>
    runHandler(
      {
        prefix: "[gg-data]",
        id,
        fields: { container, params: Object.fromEntries(params) },
        debug: deps.debug,
        emitError: deps.emitError,
      },
      () => query(deps.context, params),
    ),
  );
  if (!handlerResult.ok) return;
  const result = handlerResult.value;
  if (result === undefined) return;

  if (isList) {
    if (!Array.isArray(result)) {
      console.warn(`[gg-data-list] query "${id}" did not return an array`);
      return;
    }

    const template = container.querySelector(SEL.listTemplate);
    if (!template) {
      console.warn(`[gg-data-list] no [${ATTR.listTemplate}] inside "${id}"`);
      return;
    }

    Array.from(container.children).forEach((child) => {
      if (child !== template) child.remove();
    });

    result.forEach((record: DataRecord) => {
      const clone = template.cloneNode(true) as HTMLElement;
      clone.removeAttribute(ATTR.listTemplate);
      clone.setAttribute(ATTR.querySet, `modal:view,id:${record.id}`);
      clone.style.display = "flex";
      if (record?.id != null) clone.id = String(record.id);
      clone.__ggRecord = record;
      populateFields(clone, record);
      applySwitchFields(clone, record);
      container.appendChild(clone);
      emitDataReady(clone, record);
    });
  } else if (isForm) {
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
    runQuery(el, deps);
  });

  const unsubscribe = onQueryChanged((key) => {
    document.querySelectorAll(SEL.dataAnyOn).forEach((c) => {
      const attr = c.getAttribute(ATTR.dataOn);
      if (!attr) return;
      const keys = attr.split(",").map((s) => s.trim());
      if (keys.includes(key)) runQuery(c, deps);
    });
  });

  return () => {
    unbind();
    unsubscribe();
  };
}
