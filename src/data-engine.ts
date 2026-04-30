import { getPath } from "./helpers/path.js";
import {
  populateFields,
  setSwitchState,
  applySwitchState,
} from "./helpers/dom.js";
import { runHandler } from "./helpers/run-handler.js";
import { runWithLoading } from "./helpers/run-with-loading.js";
import { queryRegistry } from "./queries.js";
import { onQueryChanged, getParams } from "./query-params.js";

type DataRecord = Record<string, unknown>;

function applySwitchFields(root: Element, record: DataRecord): void {
  root.querySelectorAll("[gg-switch-field]").forEach((el) => {
    const path = el.getAttribute("gg-switch-field");
    if (!path) return;
    const value = getPath(record, path);
    setSwitchState(el, value);
    applySwitchState(el);
  });
}

function queryDeep(root: ParentNode, selector: string): Element[] {
  const results: Element[] = [...root.querySelectorAll(selector)];
  root.querySelectorAll("*").forEach((el) => {
    if (el.shadowRoot) results.push(...queryDeep(el.shadowRoot, selector));
  });
  return results;
}

function applyDataValues(root: ParentNode, record: DataRecord): void {
  queryDeep(root, "[gg-data-key]").forEach((el) => {
    const path = el.getAttribute("gg-data-key");
    const value = path ? getPath(record, path) : record;
    if (value === undefined) return;
    el.setAttribute("gg-data-value", JSON.stringify(value));
  });
}

function populateFormFields(root: Element, record: DataRecord): void {
  root
    .querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
      "input[name], select[name], textarea[name]",
    )
    .forEach((el) => {
      const name = el.getAttribute("name");
      if (!name) return;
      const value = getPath(record, name);
      if (value == null) return;

      if (el instanceof HTMLInputElement) {
        if (el.type === "checkbox") {
          el.checked = Boolean(value);
        } else if (el.type === "radio") {
          el.checked = String(el.value) === String(value);
        } else {
          el.value = String(value);
        }
      } else {
        el.value = String(value);
      }

      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    });
}

export function initDataEngine(
  context: unknown,
  { debug = false }: { debug?: boolean } = {},
): void {
  async function runQuery(container: Element): Promise<void> {
    const isList = container.hasAttribute("gg-data-list");
    const isForm = container.hasAttribute("gg-data-form");
    const id = container.getAttribute(
      isList ? "gg-data-list" : isForm ? "gg-data-form" : "gg-data",
    );
    if (!id) return;
    const query = queryRegistry[id];
    if (!query) {
      console.warn(`[gg-data] no query registered for "${id}"`);
      return;
    }

    const params = getParams();
    const handlerResult = await runWithLoading([container], () =>
      runHandler(
        {
          prefix: "[gg-data]",
          id,
          fields: { container, params: Object.fromEntries(params) },
          debug,
        },
        () => query(context, params),
      ),
    );
    if (!handlerResult.ok) return;
    const result = handlerResult.value;
    if (result === undefined) return;

    if (isList) {
      if (!Array.isArray(result)) {
        console.warn(
          `[gg-data-list] query "${id}" did not return an array`,
        );
        return;
      }

      const template = container.querySelector("[gg-list-template]");
      if (!template) {
        console.warn(
          `[gg-data-list] no [gg-list-template] inside "${id}"`,
        );
        return;
      }

      Array.from(container.children).forEach((child) => {
        if (child !== template) child.remove();
      });

      result.forEach((record: DataRecord) => {
        const clone = template.cloneNode(true) as HTMLElement;
        clone.removeAttribute("gg-list-template");
        clone.setAttribute(
          "gg-query-set",
          `modal:view,id:${record.id}`,
        );
        clone.style.display = "flex";
        if (record?.id != null) clone.id = String(record.id);
        clone.__ggRecord = record;
        populateFields(clone, record);
        applySwitchFields(clone, record);
        applyDataValues(clone, record);
        container.appendChild(clone);
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
      applyDataValues(container, record);
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
      applyDataValues(container, record);
    }
  }

  // Run all data containers on load
  document
    .querySelectorAll("[gg-data], [gg-data-list], [gg-data-form]")
    .forEach(runQuery);

  // Re-run queries when matching URL params change
  onQueryChanged((key) => {
    document
      .querySelectorAll(
        "[gg-data][gg-data-on], [gg-data-list][gg-data-on], [gg-data-form][gg-data-on]",
      )
      .forEach((c) => {
        const attr = c.getAttribute("gg-data-on");
        if (!attr) return;
        const keys = attr.split(",").map((s) => s.trim());
        if (keys.includes(key)) runQuery(c);
      });
  });
}
