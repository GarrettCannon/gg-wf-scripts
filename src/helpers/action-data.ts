import { ATTR } from "../attrs.js";

export type ActionData = Record<string, unknown>;

export function parseActionData(el: Element): ActionData {
  const data: ActionData = {};

  const csv = el.getAttribute(ATTR.actionData);
  if (csv) {
    csv
      .split(",")
      .filter(Boolean)
      .forEach((pair) => {
        const [key, value] = pair.split(":");
        if (key?.trim()) data[key.trim()] = value?.trim() ?? "";
      });
  }

  const prefix = `${ATTR.actionData}-`;
  for (const { name, value } of Array.from(el.attributes)) {
    if (name.startsWith(prefix)) {
      const key = name.slice(prefix.length);
      if (key) data[key] = value;
    }
  }

  return data;
}
