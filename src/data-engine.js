import { getPath } from "./helpers/path.js";
import {
  populateFields,
  setSwitchState,
  applySwitchState,
} from "./helpers/dom.js";
import { withDebugLog } from "./helpers/log.js";
import { queryRegistry } from "./queries.js";
import { onQueryChanged, getParams } from "./query-params.js";

function applySwitchFields(root, record) {
  root.querySelectorAll("[gg-switch-field]").forEach((el) => {
    const path = el.getAttribute("gg-switch-field");
    const value = getPath(record, path);
    setSwitchState(el, value);
    applySwitchState(el);
  });
}

function queryDeep(root, selector) {
  const results = [...root.querySelectorAll(selector)];
  root.querySelectorAll("*").forEach((el) => {
    if (el.shadowRoot) results.push(...queryDeep(el.shadowRoot, selector));
  });
  return results;
}

function applyDataValues(root, record) {
  queryDeep(root, "[gg-data-key]").forEach((el) => {
    const path = el.getAttribute("gg-data-key");
    const value = path ? getPath(record, path) : record;
    if (value === undefined) return;
    el.setAttribute("gg-data-value", JSON.stringify(value));
  });
}

function populateFormFields(root, record) {
  root.querySelectorAll(
    "input[name], select[name], textarea[name]",
  ).forEach((el) => {
    const name = el.getAttribute("name");
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

export function initDataEngine(context, { debug = false } = {}) {
  async function runQuery(container) {
    const isList = container.hasAttribute("gg-data-list");
    const isForm = container.hasAttribute("gg-data-form");
    const id = container.getAttribute(
      isList ? "gg-data-list" : isForm ? "gg-data-form" : "gg-data",
    );
    const query = queryRegistry[id];
    if (!query) {
      console.warn(`[gg-data] no query registered for "${id}"`);
      return;
    }

    const params = getParams();
    const result = await withDebugLog(
      "[gg-data]",
      id,
      { container, params: Object.fromEntries(params) },
      debug,
      () => query(context, params),
    );
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

      result.forEach((record) => {
        const clone = template.cloneNode(true);
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
      container.__ggRecord = result;
      populateFormFields(container, result);
      applyDataValues(container, result);
    } else {
      if (Array.isArray(result)) {
        console.warn(
          `[gg-data] query "${id}" returned an array; use gg-data-list instead`,
        );
        return;
      }
      if (!result) return;
      container.__ggRecord = result;
      populateFields(container, result);
      applySwitchFields(container, result);
      applyDataValues(container, result);
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
        const keys = c
          .getAttribute("gg-data-on")
          .split(",")
          .map((s) => s.trim());
        if (keys.includes(key)) runQuery(c);
      });
  });
}
